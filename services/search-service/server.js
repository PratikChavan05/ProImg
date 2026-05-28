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
  setupGracefulShutdown
} from "shared";
import { initElasticsearch, esClient } from "./lib/elasticsearch.js";
import { handlePinEvent } from "./events/eventHandlers.js";

loadEnv("search-service");

const logger = createLogger("search-service");
const app = express();
const PORT = servicePort("search-service", 5007);
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
    service: "search-service",
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

    logger.info(`Executing search query: "${query}"`);
    
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
              "pin._index_prefix"
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

app.use(errorHandler);

const rabbitClient = new RabbitMQClient(AMQP_URL, logger);
await rabbitClient.connect();

// Subscribe to pin-service events
await rabbitClient.subscribe(
  "search-service-pins-queue",
  [EVENTS.ENTITY_CREATED, EVENTS.ENTITY_UPDATED, EVENTS.ENTITY_DELETED],
  handlePinEvent
);

const httpServer = app.listen(PORT, () => {
  logger.info(`Search service listening on http://localhost:${PORT}`);
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
