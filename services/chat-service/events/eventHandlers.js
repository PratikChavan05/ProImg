import { UserReplica, Message } from "../models/messageModel.js";
import { createLogger } from "shared";

const logger = createLogger("chat-service-events");

export const handleUserEvents = async (payload, routingKey) => {
  const { data } = payload;

  switch (routingKey) {
    case "user.registered":
      await UserReplica.findOneAndUpdate(
        { _id: data.id },
        {
          _id: data.id,
          name: data.name,
          email: data.email,
          avatar: data.avatar || null,
          following: data.following || [],
          followers: data.followers || [],
          isPremium: Boolean(data.isPremium)
        },
        { upsert: true, new: true }
      );
      logger.info(`[Chat Service] Synchronized registered user replica: ${data.email}`);
      break;

    case "user.updated": {
      const updateData = {};
      if (data.name) updateData.name = data.name;
      if (data.email) updateData.email = data.email;
      if (data.avatar !== undefined) updateData.avatar = data.avatar;
      if (data.following) updateData.following = data.following;
      if (data.followers) updateData.followers = data.followers;
      if (typeof data.isPremium === "boolean") updateData.isPremium = data.isPremium;

      if (Object.keys(updateData).length > 0) {
        await UserReplica.findOneAndUpdate({ _id: data.id }, updateData, {
          upsert: true,
          new: true
        });
        logger.info(`[Chat Service] Synchronized updated user replica: ${data.id}`);
      }
      break;
    }

    case "user.deleted":
      // Cascade delete messages sent or received by this user
      const deletedMessages = await Message.deleteMany({
        $or: [
          { sender: data.id },
          { receiver: data.id }
        ]
      });

      await UserReplica.deleteOne({ _id: data.id });
      logger.info(`[Chat Service] Cascaded chat deletions for user: ${data.id}. Deleted ${deletedMessages.deletedCount} messages.`);
      break;

    default:
      logger.warn(`[Chat Service] Unhandled routing key in user events queue: ${routingKey}`);
  }
};
