import { esClient } from "../lib/elasticsearch.js";
import { generateTagsAndCaption, generateImageEmbedding } from "../lib/gemini.js";
import { createLogger, EVENTS } from "shared";

const logger = createLogger("ai-service-handlers");

export let rabbitClientRef = null;

export const setRabbitClient = (client) => {
  rabbitClientRef = client;
};

export const handlePinEvent = async (payload, routingKey) => {
  const correlationId = payload.correlationId || "unknown";
  const pinData = payload.data;
  
  if (!pinData || !pinData.id) {
    logger.warn(`Received pin event without ID. CorrelationID: ${correlationId}`);
    return;
  }

  const pinId = pinData.id.toString();
  const mediaUrl = pinData.media?.url || "";
  const mediaType = pinData.media?.type || "image";

  try {
    if (routingKey === "entity.created") {
      logger.info(`Processing entity.created for pin ${pinId}...`);

      let tags = [];
      let altText = "";
      let embeddingVector = null;

      // Gracefully invoke Gemini AI enrichment
      if (process.env.GEMINI_API_KEY && mediaUrl) {
        try {
          logger.info(`Requesting Gemini AI tagging for pin ${pinId}...`);
          const enrichment = await generateTagsAndCaption(mediaUrl, mediaType);
          tags = enrichment.tags || [];
          altText = enrichment.altText || "";

          if (mediaType === "image") {
            logger.info(`Generating visual embedding for pin ${pinId}...`);
            embeddingVector = await generateImageEmbedding(mediaUrl);
          }
        } catch (aiErr) {
          logger.error(`Gemini AI enrichment failed for pin ${pinId}. Continuing without AI metadata. Error: ${aiErr.message}`);
        }
      } else {
        logger.warn(`Skipping AI enrichment for pin ${pinId} (GEMINI_API_KEY or mediaUrl missing).`);
      }

      // Publish pin.enriched event back to RabbitMQ for pin-service
      if (rabbitClientRef && (tags.length > 0 || altText)) {
        try {
          logger.info(`Publishing pin.enriched event for pin ${pinId}...`);
          await rabbitClientRef.publish("pin.enriched", {
            id: pinId,
            tags,
            altText
          }, { correlationId });
        } catch (pubErr) {
          logger.error(`Failed to publish pin.enriched event for pin ${pinId}`, { error: pubErr.message });
        }
      }

      // Index document in Elasticsearch
      logger.info(`Indexing pin ${pinId} to Elasticsearch index...`);
      const body = {
        title: pinData.title || "",
        pin: pinData.pin || "",
        tags: tags,
        ownerId: (pinData.ownerId || pinData.owner || "").toString(),
        mediaUrl: mediaUrl,
        mediaType: mediaType,
        createdAt: pinData.createdAt || new Date().toISOString()
      };

      if (embeddingVector) {
        body.embedding_vector = embeddingVector;
      }

      await esClient.index({
        index: "pins",
        id: pinId,
        body
      });
      logger.info(`Pin ${pinId} indexed successfully.`);

    } else if (routingKey === "entity.updated") {
      logger.info(`Updating pin ${pinId} in Elasticsearch...`);
      
      const doc = {};
      if (pinData.title !== undefined) doc.title = pinData.title;
      if (pinData.pin !== undefined) doc.pin = pinData.pin;
      if (pinData.ownerId !== undefined) {
        doc.ownerId = pinData.ownerId.toString();
      } else if (pinData.owner !== undefined) {
        doc.ownerId = pinData.owner.toString();
      }

      // Only update if searchable fields actually changed
      if (Object.keys(doc).length > 0) {
        await esClient.update({
          index: "pins",
          id: pinId,
          body: { doc }
        });
        logger.info(`Pin ${pinId} updated successfully in Elasticsearch with fields: ${Object.keys(doc).join(", ")}.`);
      } else {
        logger.info(`Pin ${pinId} update skipped (no searchable fields in payload).`);
      }

    } else if (routingKey === "entity.deleted") {
      logger.info(`Deleting pin ${pinId} from Elasticsearch...`);
      await esClient.delete({
        index: "pins",
        id: pinId,
        ignore_unavailable: true
      });
      logger.info(`Pin ${pinId} deleted successfully.`);
    }
  } catch (err) {
    logger.error(`Error handling pin event [${routingKey}] for pin ${pinId}`, { error: err.message });
    throw err; // Trigger RabbitMQ dead-letter/re-queue logic
  }
};
