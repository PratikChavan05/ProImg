import express from "express";
import crypto from "crypto";
import cookieParser from "cookie-parser";
import {
  createLogger,
  errorHandler,
  RabbitMQClient,
  successResponse,
  EVENTS,
  loadEnv,
  servicePort,
  setupGracefulShutdown,
  AppError
} from "shared";
import { initElasticsearch, esClient } from "./lib/elasticsearch.js";
import { handlePinEvent, setRabbitClient } from "./events/eventHandlers.js";

loadEnv("ai-service");

const logger = createLogger("ai-service");
const app = express();
const PORT = servicePort("ai-service", 5008);
const AMQP_URL = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";

await initElasticsearch(logger);

app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  req.correlationId = req.headers["x-correlation-id"] || crypto.randomUUID();
  next();
 });

app.get("/health", (req, res) => {
  return successResponse(res, {
    service: "ai-service",
    status: "healthy"
  });
});

// Search API Endpoint: GET /api/search?q=query
app.get("/api/search", async (req, res, next) => {
  try {
    const query = req.query.q;
    if (!query) {
      return successResponse(res, [], "Empty query returned no results");
    }

    logger.info(`Executing autocomplete/text search query: "${query}"`);
    
    const response = await esClient.search({
      index: "pins",
      body: {
        query: {
          multi_match: {
            query,
            type: "bool_prefix",
            fields: [
              "title^3",
              "title._2gram^3",
              "title._3gram^3",
              "title._index_prefix^3",
              "pin",
              "pin._2gram",
              "pin._3gram",
              "pin._index_prefix",
              "tags^2"
            ]
          }
        }
      }
    });

    const hits = response.hits.hits.map(hit => ({
      _id: hit._id,
      ...hit._source
    }));

    return successResponse(res, hits, "Search query executed successfully");
  } catch (err) {
    next(err);
  }
});

// Similar Pins (KNN Vector Cosine Similarity Search): GET /api/search/similar/:id
app.get("/api/search/similar/:id", async (req, res, next) => {
  try {
    const pinId = req.params.id;
    logger.info(`Retrieving similar pins for pin ID: ${pinId}`);

    // 1. Fetch the target pin's document from Elasticsearch
    let sourceDoc;
    try {
      sourceDoc = await esClient.get({
        index: "pins",
        id: pinId
      });
    } catch (getErr) {
      if (getErr.statusCode === 404) {
        throw new AppError("Pin not found in search index", 404);
      }
      throw getErr;
    }

    const embedding = sourceDoc._source?.embedding_vector;
    if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
      logger.warn(`Source pin ${pinId} has no embedding vector. Returning empty results.`);
      return successResponse(res, [], "No embedding vector found for this pin");
    }

    // 2. Perform KNN Cosine Similarity Search
    // Excluding the source pin using the filter option
    const response = await esClient.search({
      index: "pins",
      body: {
        knn: {
          field: "embedding_vector",
          query_vector: embedding,
          k: 5,
          num_candidates: 50,
          filter: {
            bool: {
              must_not: [
                { ids: { values: [pinId] } }
              ]
            }
          }
        }
      }
    });

    const hits = response.hits.hits.map(hit => ({
      _id: hit._id,
      ...hit._source
    }));

    logger.info(`Found ${hits.length} visually similar pins for pin ID: ${pinId}`);
    return successResponse(res, hits, "Visual similarity search completed successfully");
  } catch (err) {
    next(err);
  }
});

app.use(errorHandler);

const rabbitClient = new RabbitMQClient(AMQP_URL, logger);
await rabbitClient.connect();

// Register the client so eventHandlers can publish pin.enriched events
setRabbitClient(rabbitClient);

// Subscribe to pin-service events
await rabbitClient.subscribe(
  "ai-service-pins-queue",
  [EVENTS.ENTITY_CREATED, EVENTS.ENTITY_UPDATED, EVENTS.ENTITY_DELETED],
  handlePinEvent
);

const httpServer = app.listen(PORT, () => {
  logger.info(`AI Search & Enrichment service listening on http://localhost:${PORT}`);
});

setupGracefulShutdown({ server: httpServer, rabbitClient, logger });

httpServer.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    logger.error(
      `Port ${PORT} is already in use. Stop the other process (lsof -i :${PORT}) or set PORT in .env.`
    );
  } else {
    logger.error("HTTP server error", { error: err.message });
  }
  process.exit(1);
});
