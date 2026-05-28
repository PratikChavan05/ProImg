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
          isPrivate: Boolean(data.isPrivate),
          isPremium: Boolean(data.isPremium)
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
      if (typeof data.isPremium === "boolean") updateData.isPremium = data.isPremium;

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

/**
 * Handles AI enrichment events from the ai-service.
 * Updates pins with AI-generated tags and alt-text.
 */
export const handleEnrichmentEvents = async (payload, routingKey) => {
  const { data } = payload;
  const correlationId = payload.correlationId || "unknown";

  if (routingKey === "pin.enriched") {
    if (!data || !data.id) {
      logger.warn(`[Pin Service] Received pin.enriched event without ID. CorrelationID: ${correlationId}`);
      return;
    }

    try {
      const updateFields = {};
      if (Array.isArray(data.tags) && data.tags.length > 0) {
        updateFields.tags = data.tags;
      }
      if (data.altText) {
        updateFields.altText = data.altText;
      }

      if (Object.keys(updateFields).length > 0) {
        await Pin.findByIdAndUpdate(data.id, updateFields);
        logger.info(`[Pin Service] Enriched pin ${data.id} with AI metadata. Tags: ${(updateFields.tags || []).length}, AltText: ${updateFields.altText ? "yes" : "no"}`);
      }
    } catch (err) {
      logger.error(`[Pin Service] Failed to apply enrichment for pin ${data.id}`, { error: err.message });
      throw err;
    }
  } else {
    logger.warn(`[Pin Service] Unhandled routing key in enrichment queue: ${routingKey}`);
  }
};
