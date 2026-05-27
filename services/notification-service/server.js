import express from "express";
import crypto from "crypto";
import cookieParser from "cookie-parser";
import {
  createLogger,
  connectDatabase,
  errorHandler,
  RabbitMQClient,
  successResponse,
  EVENTS,
  loadEnv,
  buildMongoUri,
  servicePort,
  mongoose,
  setupGracefulShutdown
} from "shared";
import notificationRoutes from "./routes/notificationRoutes.js";
import { startScheduler, runScheduledJobsOnce } from "./jobs/scheduler.js";

loadEnv("notification-service");


const {
  handleEmailNotification,
  handleSocialActivity,
  handleMessageReceived
} = await import("./lib/eventHandlers.js");

const logger = createLogger("notification-service");
const app = express();
const PORT = servicePort("notification-service", 5006);
const MONGO_URI = buildMongoUri("proimg-notifications");
const AMQP_URL = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";

await connectDatabase(MONGO_URI, logger);

app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  req.correlationId = req.headers["x-correlation-id"] || crypto.randomUUID();
  next();
});

const cronMeta = startScheduler();

app.get("/health", (req, res) => {
  return successResponse(res, {
    service: "notification-service",
    status: "healthy",
    scheduler: "active",
    cronFast: cronMeta.fast,
    schedules: {
      cleanup: cronMeta.cleanupCron,
      digest: cronMeta.digestCron,
      heartbeat: cronMeta.heartbeatCron
    },
    testHint: cronMeta.fast
      ? "POST /health/run-jobs to run cleanup+digest now; like/follow/message to test in-app notifications"
      : undefined
  });
});

// Dev / fast-cron only — trigger jobs immediately
app.post("/health/run-jobs", async (req, res, next) => {
  if (process.env.CRON_FAST !== "true" && process.env.NODE_ENV !== "development") {
    return res.status(404).json({ success: false, message: "Not available" });
  }
  try {
    const result = await runScheduledJobsOnce();
    return successResponse(res, result, "Cron jobs executed");
  } catch (err) {
    next(err);
  }
});

app.use("/api/notifications", notificationRoutes);

app.use(errorHandler);

const rabbitClient = new RabbitMQClient(AMQP_URL, logger);
await rabbitClient.connect();

await rabbitClient.subscribe(
  "notification-service-emails-queue",
  [EVENTS.NOTIFICATION_TRIGGERED],
  handleEmailNotification
);

await rabbitClient.subscribe(
  "notification-service-social-queue",
  [EVENTS.SOCIAL_ACTIVITY],
  handleSocialActivity
);

await rabbitClient.subscribe(
  "notification-service-messages-queue",
  [EVENTS.MESSAGE_RECEIVED],
  handleMessageReceived
);

const httpServer = app.listen(PORT, () => {
  logger.info(`Notification service listening on http://localhost:${PORT}`);
  logger.info("Worker queues: email, social, messages | Cron: cleanup + weekly digest");
});

setupGracefulShutdown({ server: httpServer, mongoose, rabbitClient, logger });

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
