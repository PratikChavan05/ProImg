import express from "express";
import http from "http";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import messageRoutes from "./routes/messageRoutes.js";
import { configureSockets } from "./sockets/socketHandler.js";
import { handleUserEvents } from "./events/eventHandlers.js";
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

loadEnv("chat-service");

const logger = createLogger("chat-service");
const app = express();
const server = http.createServer(app);

const PORT = servicePort("chat-service", 5003);
const MONGO_URI = buildMongoUri("proimg-chats");
const AMQP_URL = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";

// Bind Socket.io onto HTTP server with CORS matched to Gateway domain
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === "production" 
      ? ["https://pro-img-48i9.vercel.app", process.env.FRONTEND_URL].filter(Boolean)
      : ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000
});

// Register io globally in Express settings to make it accessible inside routes
app.set("io", io);

// Connect to Database
await connectDatabase(MONGO_URI, logger);

// Setup RabbitMQ client and subscriptions
const rabbitClient = new RabbitMQClient(AMQP_URL, logger);
await rabbitClient.connect();

// Subscribe to eventual consistency events (User events)
await rabbitClient.subscribe(
  "chat-service-user-events-queue",
  ["user.registered", "user.updated", "user.deleted"],
  handleUserEvents
);

// Inject clients into request context
app.use((req, res, next) => {
  req.rabbitClient = rabbitClient;
  req.logger = logger;
  req.correlationId = req.headers["x-correlation-id"] || "chat-service-internal";
  next();
});

app.use(express.json());
app.use(cookieParser());

// Mount Message Routes
app.use("/api/message", messageRoutes);

// Configure Socket event loops
configureSockets(io, logger);

// Health check endpoint
app.get("/health", (req, res) => {
  return successResponse(res, { service: "chat-service", status: "healthy" });
});

// Standard Error Middleware
app.use(errorHandler);

server.listen(PORT, () => {
  logger.info(`Chat microservice and Socket.io server listening on port ${PORT}`);
});

setupGracefulShutdown({ server, mongoose, rabbitClient, logger });
