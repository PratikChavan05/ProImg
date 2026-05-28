import express from "express";
import cookieParser from "cookie-parser";
import cloudinary from "cloudinary";
import pinRoutes from "./routes/pinRoutes.js";
import { handleUserEvents, handleEnrichmentEvents } from "./events/eventHandlers.js";
import {
  createLogger,
  connectDatabase,
  errorHandler,
  RabbitMQClient,
  successResponse,
  loadEnv,
  buildMongoUri,
  servicePort,
  mongoose,
  setupGracefulShutdown
} from "shared";

loadEnv("pin-service");

const logger = createLogger("pin-service");
const app = express();
const PORT = servicePort("pin-service", 5002);
const MONGO_URI = buildMongoUri("proimg-pins");
const AMQP_URL = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";

// Configure Cloudinary
if (!process.env.Cloud_Name || !process.env.Cloud_Api || !process.env.Cloud_Secret) {
  logger.error("Cloudinary credentials missing in environment!");
  process.exit(1);
}

cloudinary.v2.config({
  cloud_name: process.env.Cloud_Name,
  api_key: process.env.Cloud_Api,
  api_secret: process.env.Cloud_Secret,
});

// Connect to MongoDB
await connectDatabase(MONGO_URI, logger);

// Setup RabbitMQ client and subscriptions
const rabbitClient = new RabbitMQClient(AMQP_URL, logger);
await rabbitClient.connect();

// Subscribe to eventual consistency events (User events)
await rabbitClient.subscribe(
  "pin-service-user-events-queue",
  ["user.registered", "user.updated", "user.deleted"],
  handleUserEvents
);

// Subscribe to AI enrichment events (tags + alt-text from ai-service)
await rabbitClient.subscribe(
  "pin-service-enrichment-queue",
  ["pin.enriched"],
  handleEnrichmentEvents
);

// Inject clients into request context
app.use((req, res, next) => {
  req.rabbitClient = rabbitClient;
  req.logger = logger;
  req.correlationId = req.headers["x-correlation-id"] || "pin-service-internal";
  next();
});

app.use(express.json());
app.use(cookieParser());

// Mount Pin Routes
app.use("/api/pin", pinRoutes);

// Service Health Check
app.get("/health", (req, res) => {
  return successResponse(res, { service: "pin-service", status: "healthy" });
});

// Standard Error Middleware
app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info(`Pin microservice listening on port ${PORT}`);
});

setupGracefulShutdown({ server, mongoose, rabbitClient, logger });
