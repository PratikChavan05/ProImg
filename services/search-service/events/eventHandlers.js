import { esClient } from "../lib/elasticsearch.js";
import { createLogger } from "shared";

const logger = createLogger("search-service-handlers");

export const handlePinEvent = async (payload, routingKey) => {
  const correlationId = payload.correlationId || "unknown";
  const pinData = payload.data;
  
  if (!pinData || !pinData.id) {
    logger.warn(`Received pin event without ID. CorrelationID: ${correlationId}`);
    return;
  }

  const pinId = pinData.id.toString();

  try {
    if (routingKey === "entity.created" || routingKey === "entity.updated") {
      logger.info(`Indexing pin ${pinId}. CorrelationID: ${correlationId}`);
      await esClient.index({
        index: "pins",
        id: pinId,
        body: {
          title: pinData.title || "",
          pin: pinData.pin || "",
          ownerId: (pinData.ownerId || pinData.owner || "").toString(),
          mediaUrl: pinData.media?.url || "",
          mediaType: pinData.media?.type || "image",
          createdAt: pinData.createdAt || new Date().toISOString()
        }
      });
      logger.info(`Pin ${pinId} indexed successfully.`);
    } else if (routingKey === "entity.deleted") {
      logger.info(`Deleting pin ${pinId} from index. CorrelationID: ${correlationId}`);
      await esClient.delete({
        index: "pins",
        id: pinId,
        ignore_unavailable: true
      });
      logger.info(`Pin ${pinId} deleted successfully.`);
    }
  } catch (err) {
    logger.error(`Error handling pin event [${routingKey}] for pin ${pinId}`, { error: err.message });
    throw err; // Allow dead-letter/retry logic in RabbitMQ client to handle it
  }
};
