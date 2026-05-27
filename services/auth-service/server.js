import express from "express";
import cookieParser from "cookie-parser";
import passport from "./controllers/passport.js";
import session from "express-session";
import userRoutes from "./routes/userRoutes.js";
import { setRabbitClient } from "./lib/rabbitHolder.js";
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
import { startAuthScheduler } from "./jobs/scheduler.js";

loadEnv("auth-service");

const logger = createLogger("auth-service");
const app = express();
const PORT = servicePort("auth-service", 5001);
const MONGO_URI = buildMongoUri("proimg-auth");
const AMQP_URL = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";

// Connect to Database
await connectDatabase(MONGO_URI, logger);

// Setup RabbitMQ Client
const rabbitClient = new RabbitMQClient(AMQP_URL, logger);
await rabbitClient.connect();
setRabbitClient(rabbitClient);

// Make rabbit client accessible in routes
app.use((req, res, next) => {
  req.rabbitClient = rabbitClient;
  req.logger = logger;
  req.correlationId = req.headers["x-correlation-id"] || "auth-service-internal";
  next();
});

app.use(express.json());
app.use(cookieParser());

// Express Session for Google OAuth support
app.use(
  session({
    secret: process.env.SESSION_SECRET || "proimg-auth-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Mount User Routes
app.use("/api/user", userRoutes);

// Service Health Check
app.get("/health", (req, res) => {
  return successResponse(res, { service: "auth-service", status: "healthy" });
});

// Centralized Error Middleware
app.use(errorHandler);

startAuthScheduler();

const server = app.listen(PORT, () => {
  logger.info(`Auth and User microservice listening on port ${PORT}`);
});

setupGracefulShutdown({ server, mongoose, rabbitClient, logger });
