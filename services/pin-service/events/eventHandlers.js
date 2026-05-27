import { UserReplica, Pin } from "../models/pinModel.js";
import { createLogger } from "shared";

const logger = createLogger("pin-service-events");

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
          following: data.following || [],
          followers: data.followers || [],
          isPrivate: Boolean(data.isPrivate)
        },
        { upsert: true, new: true }
      );
      logger.info(`[Pin Service] Synchronized registered user replica: ${data.email}`);
      break;

    case "user.updated": {
      const updateData = {};
      if (data.name) updateData.name = data.name;
      if (data.email) updateData.email = data.email;
      if (data.following) updateData.following = data.following;
      if (data.followers) updateData.followers = data.followers;
      if (typeof data.isPrivate === "boolean") updateData.isPrivate = data.isPrivate;

      if (Object.keys(updateData).length > 0) {
        await UserReplica.findOneAndUpdate({ _id: data.id }, updateData, {
          upsert: true,
          new: true
        });
        logger.info(`[Pin Service] Synchronized updated user replica: ${data.id}`);
      }
      break;
    }

    case "user.deleted": {
      const deletedPins = await Pin.deleteMany({ owner: data.id });

      await Pin.updateMany(
        {},
        {
          $pull: {
            likes: data.id,
            views: data.id,
            comments: { user: data.id.toString() }
          }
        }
      );

      await UserReplica.deleteOne({ _id: data.id });
      logger.info(
        `[Pin Service] Cascaded deletions for deleted user: ${data.id}. Deleted ${deletedPins.deletedCount} pins.`
      );
      break;
    }

    default:
      logger.warn(`[Pin Service] Unhandled routing key in user events queue: ${routingKey}`);
  }
};
