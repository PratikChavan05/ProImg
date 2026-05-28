import cloudinary from "cloudinary";
import { Pin, UserReplica } from "../models/pinModel.js";
import getDataUrl from "../utils/urlGenerator.js";
import { AppError, successResponse } from "shared";
import { canViewOwnerContent } from "../lib/privacy.js";
import { notifyPinOwner } from "../lib/notify.js";

const ownerIdStr = (owner) => (owner?._id || owner)?.toString();

// Create a new Pin
export const createPin = async (req, res, next) => {
  try {
    const { title, pin } = req.body;
    const file = req.file;

    if (!title || !pin) {
      throw new AppError("Title and pin description are required", 400);
    }

    if (!file) {
      throw new AppError("Media file is required.", 400);
    }

    const fileUrl = getDataUrl(file);
    let cloud;
    let resourceType;

    if (file.mimetype.startsWith("image")) {
      cloud = await cloudinary.v2.uploader.upload(fileUrl.content, {
        folder: "proimg/pins"
      });
      resourceType = "image";
    } else if (file.mimetype.startsWith("video")) {
      cloud = await cloudinary.v2.uploader.upload(fileUrl.content, {
        resource_type: "video",
        folder: "proimg/pins"
      });
      resourceType = "video";
    } else {
      throw new AppError("Unsupported file type. Please upload an image or video.", 400);
    }

    const newPin = await Pin.create({
      title,
      pin,
      media: {
        id: cloud.public_id,
        url: cloud.secure_url,
        type: resourceType,
      },
      owner: req.user.id,
    });

    // Publish event: entity.created
    await req.rabbitClient.publish("entity.created", {
      entityType: "pin",
      id: newPin._id,
      title: newPin.title,
      ownerId: newPin.owner
    }, req.correlationId);

    return successResponse(res, newPin, "Pin created successfully", 201);
  } catch (err) {
    next(err);
  }
};

// Delete a Pin
export const deletePin = async (req, res, next) => {
  try {
    const pin = await Pin.findById(req.params.id);

    if (!pin) {
      throw new AppError("No Pin with this ID exists", 404);
    }

    if (pin.owner.toString() !== req.user.id.toString()) {
      throw new AppError("Unauthorized to delete this pin", 403);
    }

    // Destroy Cloudinary Asset
    try {
      await cloudinary.v2.uploader.destroy(pin.media.id, {
        resource_type: pin.media.type,
      });
    } catch (cErr) {
      req.logger.warn("Failed to delete media asset from Cloudinary", { publicId: pin.media.id, error: cErr.message });
    }

    await pin.deleteOne();

    // Publish event: entity.deleted
    await req.rabbitClient.publish("entity.deleted", {
      entityType: "pin",
      id: req.params.id,
      ownerId: req.user.id
    }, req.correlationId);

    return successResponse(res, {}, "Pin Deleted successfully");
  } catch (err) {
    next(err);
  }
};

// Get All Pins (Discover Feed - Fully Optimized and Paginated)
export const getAllPins = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const viewerId = req.user.id;
    // Populate privacy settings locally to check permissions in-memory
    const pins = await Pin.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("owner", "name email isPrivate followers");
    const visible = [];
    for (const pin of pins) {
      const owner = pin.owner;
      let allowed = true;
      if (owner) {
        const ownerId = (owner._id || owner).toString();
        if (ownerId !== viewerId.toString() && owner.isPrivate) {
          allowed = (owner.followers || []).some(
            (f) => (f._id || f).toString() === viewerId.toString()
          );
        }
      }
      if (allowed) {
        // Strip out the loaded followers array to prevent sending unnecessary payload down the wire
        const plainPin = pin.toObject ? pin.toObject() : { ...pin };
        if (plainPin.owner) {
          delete plainPin.owner.followers;
        }
        visible.push(plainPin);
      }
    }
    return successResponse(res, visible, "Discover feed retrieved successfully");
  } catch (err) {
    next(err);
  }
};

// Following feed — pins from people you follow (+ your own)
export const getFeedPins = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const replica = await UserReplica.findById(req.user.id);
    const followingIds = (replica?.following || []).map((id) => id.toString());
    const ownerIds = [req.user.id.toString(), ...followingIds];
    const pins = await Pin.find({ owner: { $in: ownerIds } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("owner", "name email");
    return successResponse(res, pins, "Following feed retrieved successfully");
  } catch (err) {
    next(err);
  }
};

// Get a Single Pin
export const getSinglePin = async (req, res, next) => {
  try {
    const pin = await Pin.findById(req.params.id).populate("owner", "name email");

    if (!pin) {
      throw new AppError("Pin not found", 404);
    }

    const allowed = await canViewOwnerContent(req.user.id, ownerIdStr(pin.owner));
    if (!allowed) {
      throw new AppError("This pin is from a private account", 403);
    }

    return successResponse(res, pin);
  } catch (err) {
    next(err);
  }
};

// Pins for a user profile (respects private accounts)
export const getPinsByUser = async (req, res, next) => {
  try {
    const ownerId = req.params.ownerId;
    const allowed = await canViewOwnerContent(req.user.id, ownerId);
    if (!allowed) {
      throw new AppError("This account is private", 403);
    }
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const pins = await Pin.find({ owner: ownerId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("owner", "name email");

    return successResponse(res, pins);
  } catch (err) {
    next(err);
  }
};

// Update Pin Metadata
export const updatePin = async (req, res, next) => {
  try {
    const pin = await Pin.findById(req.params.id);

    if (!pin) {
      throw new AppError("Pin not found", 404);
    }

    if (pin.owner.toString() !== req.user.id.toString()) {
      throw new AppError("Unauthorized to update this pin", 403);
    }

    pin.title = req.body.title || pin.title;
    pin.pin = req.body.pin || pin.pin;

    await pin.save();

    // Publish event: entity.updated
    await req.rabbitClient.publish("entity.updated", {
      entityType: "pin",
      id: pin._id,
      title: pin.title,
      ownerId: pin.owner
    }, req.correlationId);

    return successResponse(res, pin, "Pin updated successfully");
  } catch (err) {
    next(err);
  }
};

// Comment on a Pin
export const commentOnPin = async (req, res, next) => {
  try {
    const { comment } = req.body;
    if (!comment) {
      throw new AppError("Comment text is required", 400);
    }

    const pin = await Pin.findById(req.params.id);
    if (!pin) {
      throw new AppError("Pin not found", 404);
    }

    // Retrieve user name from local replica collection
    const userReplica = await UserReplica.findById(req.user.id);
    const userName = userReplica ? userReplica.name : req.user.name || "Anonymous";

    const commentData = {
      user: req.user.id,
      name: userName,
      comment: comment,
    };

    pin.comments.push(commentData);
    await pin.save();

    await req.rabbitClient.publish("entity.updated", {
      entityType: "pin",
      id: pin._id,
      action: "comment_added",
      userId: req.user.id
    }, req.correlationId);

    await notifyPinOwner(req, pin, {
      type: "comment",
      actorName: userName,
      body: comment.slice(0, 200)
    });

    return successResponse(res, pin.comments[pin.comments.length - 1], "Comment added successfully");
  } catch (err) {
    next(err);
  }
};

// Delete Comment
export const deleteComment = async (req, res, next) => {
  try {
    const commentId = req.query.commentId;
    if (!commentId) {
      throw new AppError("Please provide commentId in query parameters", 400);
    }

    const pin = await Pin.findById(req.params.id);
    if (!pin) {
      throw new AppError("Pin not found", 404);
    }

    const commentIndex = pin.comments.findIndex(
      (item) => item._id.toString() === commentId.toString()
    );

    if (commentIndex === -1) {
      throw new AppError("Comment not found", 404);
    }

    const comment = pin.comments[commentIndex];

    if (comment.user.toString() !== req.user.id.toString()) {
      throw new AppError("Unauthorized to delete this comment", 403);
    }

    pin.comments.splice(commentIndex, 1);
    await pin.save();

    // Publish event: entity.updated
    await req.rabbitClient.publish("entity.updated", {
      entityType: "pin",
      id: pin._id,
      action: "comment_deleted",
      userId: req.user.id
    }, req.correlationId);

    return successResponse(res, {}, "Comment Deleted successfully");
  } catch (err) {
    next(err);
  }
};

// Like & Unlike a Pin
export const likeAndUnlike = async (req, res, next) => {
  try {
    const pin = await Pin.findById(req.params.id);
    const loggedInUser = req.user.id;

    if (!pin) {
      throw new AppError("Pin not found", 404);
    }

    const isLiked = pin.likes.some(id => id.toString() === loggedInUser.toString());

    if (isLiked) {
      pin.likes = pin.likes.filter(id => id.toString() !== loggedInUser.toString());
      await pin.save();

      // Publish event
      await req.rabbitClient.publish("entity.updated", {
        entityType: "pin",
        id: pin._id,
        action: "unliked",
        userId: loggedInUser
      }, req.correlationId);

      return successResponse(res, {}, "Disliked");
    } else {
      pin.likes.push(loggedInUser);
      await pin.save();

      await req.rabbitClient.publish("entity.updated", {
        entityType: "pin",
        id: pin._id,
        action: "liked",
        userId: loggedInUser
      }, req.correlationId);

      const actor = await UserReplica.findById(loggedInUser).select("name");
      await notifyPinOwner(req, pin, {
        type: "like",
        actorName: actor?.name || req.user.name || "Someone"
      });

      return successResponse(res, {}, "Pin liked successfully");
    }
  } catch (err) {
    next(err);
  }
};

// Record Pin View Count
export const countViews = async (req, res, next) => {
  try {
    const { pinId } = req.body;
    const userId = req.user.id;

    if (!pinId) {
      throw new AppError("pinId is required", 400);
    }

    const pin = await Pin.findById(pinId);
    if (!pin) {
      throw new AppError("Pin not found", 404);
    }

    const isViewed = pin.views.some((id) => id.toString() === userId.toString());
    if (isViewed) {
      throw new AppError("Already viewed", 400);
    }

    pin.views.push(userId);
    await pin.save();

    // Publish event
    await req.rabbitClient.publish("entity.updated", {
      entityType: "pin",
      id: pin._id,
      action: "viewed",
      userId
    }, req.correlationId);

    return successResponse(res, {}, "Pin viewed successfully");
  } catch (err) {
    next(err);
  }
};

// Retrieve Views List (Populates names from local replica users)
export const getViews = async (req, res, next) => {
  try {
    const pin = await Pin.findById(req.params.id).populate("views", "name");
    if (!pin) {
      throw new AppError("Pin not found", 404);
    }
    return successResponse(res, pin.views);
  } catch (err) {
    next(err);
  }
};

// Retrieve Likes List (Populates names from local replica users)
export const getLikes = async (req, res, next) => {
  try {
    const pin = await Pin.findById(req.params.id).populate("likes", "name");
    if (!pin) {
      throw new AppError("Pin not found", 404);
    }
    return successResponse(res, pin.likes);
  } catch (err) {
    next(err);
  }
};

// Get Pins Liked by User
export const myLikes = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new AppError("User ID parameter is required", 400);
    }
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const pins = await Pin.find({ likes: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    return successResponse(res, pins);
  } catch (err) {
    next(err);
  }
};
