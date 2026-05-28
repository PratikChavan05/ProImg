import express from "express";
import { Message, UserReplica } from "../models/messageModel.js";
import { isAuth, AppError, successResponse, mongoose, EVENTS } from "shared";
import { emitMessage, serializeMessage } from "../lib/messagePayload.js";
import { assertCanMessage } from "../lib/messagingAccess.js";
import { encrypt, decrypt } from "../lib/crypto.js";

const router = express.Router();

// Send a Message
router.post("/send", isAuth, async (req, res, next) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user.id;

    if (!content || !receiverId) {
      throw new AppError("Content and receiverId are required", 400);
    }

    const [senderReplica, receiver] = await Promise.all([
      UserReplica.findById(senderId).select("name email followers following"),
      UserReplica.findById(receiverId).select("name email followers following")
    ]);

    if (!receiver) {
      throw new AppError("Receiver not found in chat directory", 404);
    }
    if (!senderReplica) {
      throw new AppError("Your profile is not synced for chat yet. Try logging in again.", 400);
    }

    const access = assertCanMessage(senderReplica, receiver);
    if (!access.ok) {
      throw new AppError(access.message, 403);
    }

    const newMessage = new Message({ 
      sender: senderId, 
      receiver: receiverId, 
      content: encrypt(content),
      read: false
    });
    
    await newMessage.save();

    const populatedMessage = await Message.findById(newMessage._id)
      .populate("sender", "name email avatar")
      .populate("receiver", "name email avatar");

    // Decrypt content for the real-time websocket emission and response
    const decryptedMessage = populatedMessage.toObject();
    decryptedMessage.content = decrypt(decryptedMessage.content);

    const io = req.app.get("io");
    emitMessage(io, decryptedMessage);

    let previewText = decryptedMessage.content || "";
    try {
      const parsed = JSON.parse(previewText);
      if (parsed && parsed.isEncrypted) {
        previewText = "🔒 End-to-End Encrypted Message";
      }
    } catch (e) {
      // Plaintext fallback
    }

    if (req.rabbitClient) {
      await req.rabbitClient.publish(
        EVENTS.MESSAGE_RECEIVED,
        {
          recipientId: receiverId,
          recipientEmail: receiver.email,
          senderId,
          senderName: senderReplica?.name || req.user.name || "Someone",
          preview: previewText.slice(0, 120),
          conversationLink: `/messages/${senderId}`
        },
        req.correlationId
      );
    }

    return successResponse(res, serializeMessage(decryptedMessage), "Message sent successfully", 201);
  } catch (error) {
    next(error);
  }
});

// Retrieve Active Conversations List (Memory-Safe)
router.get("/conversations", isAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const conversations = await Message.aggregate([
      {
        $match: { 
          $or: [
            { sender: userObjectId }, 
            { receiver: userObjectId }
          ] 
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: {
              if: { $eq: ["$sender", userObjectId] },
              then: "$receiver",
              else: "$sender"
            }
          },
          lastMessage: { $first: "$$ROOT" },
          // Count unread messages inside the group using memory-safe conditional aggregation
          unreadCount: {
            $sum: {
              $cond: {
                if: {
                  $and: [
                    { $eq: ["$receiver", userObjectId] },
                    { $eq: ["$read", false] }
                  ]
                },
                then: 1,
                else: 0
              }
            }
          }
        }
      },
      {
        $lookup: {
          from: "users", // Maps to local user replicas collection
          localField: "_id",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      { $unwind: "$userDetails" },
      {
        $project: {
          _id: 1,
          user: {
            _id: "$userDetails._id",
            name: "$userDetails.name",
            email: "$userDetails.email",
            avatar: { $ifNull: ["$userDetails.avatar", null] }
          },
          lastMessage: 1,
          unreadCount: 1,
          lastActivity: "$lastMessage.createdAt"
        }
      },
      { $sort: { lastActivity: -1 } }
    ]);

    // Decrypt the lastMessage.content of each conversation
    const decryptedConversations = conversations.map(convo => {
      if (convo.lastMessage && convo.lastMessage.content) {
        convo.lastMessage.content = decrypt(convo.lastMessage.content);
      }
      return convo;
    });

    return successResponse(res, decryptedConversations, "Conversations list retrieved successfully");
  } catch (error) {
    next(error);
  }
});

// Retrieve History with specific User (Paginated) & Mark messages as Read
router.get("/:userId", isAuth, async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      throw new AppError("Invalid User ID", 400);
    }

    const [me, other] = await Promise.all([
      UserReplica.findById(currentUserId).select("followers following"),
      UserReplica.findById(otherUserId).select("followers following")
    ]);

    if (!other) {
      throw new AppError("User not found", 404);
    }

    const access = assertCanMessage(me, other);
    if (!access.ok) {
      throw new AppError(access.message, 403);
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 40));
    const skip = (page - 1) * limit;

    // Fetch latest messages first, paginated
    const rawMessages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: otherUserId },
        { sender: otherUserId, receiver: currentUserId }
      ]
    })
      .sort({ createdAt: -1 }) // Get newest messages first
      .skip(skip)
      .limit(limit)
      .populate("sender", "name email avatar")
      .populate("receiver", "name email avatar");

    // Reverse messages back to chronological order (oldest to newest) and decrypt
    const decryptedMessages = rawMessages.reverse().map(msg => {
      const m = msg.toObject();
      m.content = decrypt(m.content);
      return m;
    });

    // Mark messages from other user to me as read
    const unreadMessages = await Message.updateMany(
      { sender: otherUserId, receiver: currentUserId, read: false },
      { read: true }
    );

    if (unreadMessages.modifiedCount > 0) {
      const io = req.app.get("io");
      if (io) {
        io.to(otherUserId.toString()).emit("messagesRead", currentUserId.toString());
      }
    }

    return successResponse(res, decryptedMessages, "Chat history retrieved successfully");
  } catch (error) {
    next(error);
  }
});

// Mark a single message as Read
router.put("/read/:messageId", isAuth, async (req, res, next) => {
  try {
    const messageId = req.params.messageId;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      throw new AppError("Invalid Message ID", 400);
    }

    const message = await Message.findById(messageId);
    
    if (!message) {
      throw new AppError("Message not found", 404);
    }
    if (message.receiver.toString() !== userId.toString()) {
      throw new AppError("Not authorized to read this message", 403);
    }

    if (!message.read) {
      message.read = true;
      await message.save();

      const io = req.app.get("io");
      if (io) {
        io.to(message.sender.toString()).emit("messageReadUpdate", messageId);
      }
    }

    return successResponse(res, {}, "Message marked as read");
  } catch (error) {
    next(error);
  }
});

// Delete Message
router.delete("/:messageId", isAuth, async (req, res, next) => {
  try {
    const messageId = req.params.messageId;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      throw new AppError("Invalid Message ID", 400);
    }

    const message = await Message.findById(messageId);
    
    if (!message) {
      throw new AppError("Message not found", 404);
    }

    if (message.sender.toString() !== userId.toString()) {
      throw new AppError("Unauthorized to delete this message", 403);
    }

    await Message.findByIdAndDelete(messageId);

    const io = req.app.get("io");
    if (io) {
      io.to(message.receiver.toString()).emit("messageDeleted", messageId);
    }

    return successResponse(res, {}, "Message deleted successfully");
  } catch (error) {
    next(error);
  }
});

export default router;
