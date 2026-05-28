import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import httpProxy from "http-proxy";
import proxy from "express-http-proxy";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { createLogger, successResponse, errorResponse, loadEnv, servicePort, setupGracefulShutdown } from "shared";

loadEnv("gateway");

const logger = createLogger("gateway");
const app = express();
const server = http.createServer(app);
const wsProxy = httpProxy.createProxyServer({});

const PORT = servicePort("gateway", 5005);
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:5001";
const PIN_SERVICE_URL = process.env.PIN_SERVICE_URL || "http://localhost:5002";
const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL || "http://localhost:5003";
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || "http://localhost:5006";
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5008";

// Security Configuration
app.use(helmet({
  contentSecurityPolicy: false, // Turn off CSP for dev convenience with dynamic CDNs
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS Configuration
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Correlation-ID"]
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Correlation ID Middleware
app.use((req, res, next) => {
  const correlationId = req.headers["x-correlation-id"] || crypto.randomUUID();
  req.correlationId = correlationId;
  res.setHeader("X-Correlation-ID", correlationId);
  req.logger = {
    info: (msg, meta) => logger.info(msg, { ...meta, correlationId }),
    warn: (msg, meta) => logger.warn(msg, { ...meta, correlationId }),
    error: (msg, meta) => logger.error(msg, { ...meta, correlationId })
  };
  next();
});

// Custom Morgan logging with correlation ID
morgan.token("correlation-id", (req) => req.correlationId);
app.use(morgan("[:correlation-id] :method :url :status :res[content-length] - :response-time ms", {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // limit each IP to 200 requests per window
  message: "Too many requests from this IP, please try again after 15 minutes"
});
app.use(globalLimiter);

// Gateway Health Check & Service Aggregator
app.get("/health", async (req, res) => {
  const services = [
    { name: "auth-service", url: `${AUTH_SERVICE_URL}/health` },
    { name: "pin-service", url: `${PIN_SERVICE_URL}/health` },
    { name: "chat-service", url: `${CHAT_SERVICE_URL}/health` },
    { name: "notification-service", url: `${NOTIFICATION_SERVICE_URL}/health` },
    { name: "ai-service", url: `${AI_SERVICE_URL}/health` }
  ];

  const status = { gateway: "healthy", services: {} };

  await Promise.all(
    services.map(async (srv) => {
      try {
        const response = await fetch(srv.url);
        if (response.ok) {
          status.services[srv.name] = "healthy";
        } else {
          status.services[srv.name] = `unhealthy (${response.status})`;
        }
      } catch (err) {
        status.services[srv.name] = `offline (${err.message})`;
      }
    })
  );

  return successResponse(res, status, "Gateway health checked successfully");
});

const socketProxyOptions = {
  target: CHAT_SERVICE_URL,
  changeOrigin: true,
  ws: true
};

// Socket.io HTTP long-polling
app.use("/socket.io", (req, res) => {
  wsProxy.web(req, res, socketProxyOptions, (err) => {
    logger.error("Socket HTTP proxy error:", { error: err.message });
    if (!res.headersSent) {
      res.status(502).end();
    }
  });
});

// HTTP Proxies to Downstream Services
// Auth and User Service
app.use("/api/user", proxy(AUTH_SERVICE_URL, {
  parseReqBody: true,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers["X-Correlation-ID"] = srcReq.correlationId;
    return proxyReqOpts;
  },
  proxyReqPathResolver: (req) => {
    return `/api/user${req.url}`;
  }
}));

// Pin Service — stream multipart bodies; parse JSON bodies for comments/likes
app.use("/api/pin", (req, res, next) => {
  const isMultipart = req.headers["content-type"]?.includes("multipart");
  return proxy(PIN_SERVICE_URL, {
    parseReqBody: !isMultipart,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["X-Correlation-ID"] = srcReq.correlationId;
      return proxyReqOpts;
    },
    proxyReqPathResolver: (req) => {
      return `/api/pin${req.url}`;
    }
  })(req, res, next);
});

// Notification Service
app.use("/api/notifications", proxy(NOTIFICATION_SERVICE_URL, {
  parseReqBody: true,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers["X-Correlation-ID"] = srcReq.correlationId;
    return proxyReqOpts;
  },
  proxyReqPathResolver: (req) => {
    return `/api/notifications${req.url}`;
  }
}));

// Chat Service
app.use("/api/message", proxy(CHAT_SERVICE_URL, {
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers["X-Correlation-ID"] = srcReq.correlationId;
    return proxyReqOpts;
  },
  proxyReqPathResolver: (req) => {
    return `/api/message${req.url}`;
  }
}));

// AI Search Service
app.use("/api/search", proxy(AI_SERVICE_URL, {
  parseReqBody: true,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers["X-Correlation-ID"] = srcReq.correlationId;
    return proxyReqOpts;
  },
  proxyReqPathResolver: (req) => {
    return `/api/search${req.url}`;
  }
}));

// Root SPA support placeholder (if accessed directly)
app.get("/", (req, res) => {
  res.send("ProImg API Gateway is running.");
});

// WebSocket Proxy Upgrade Handling
server.on("upgrade", (req, socket, head) => {
  if (req.url.startsWith("/socket.io")) {
    logger.info("Upgrading Socket connection to WebSocket protocol...");
    wsProxy.ws(req, socket, head, socketProxyOptions, (err) => {
      logger.error("Socket WS upgrade proxy error:", { error: err.message });
      socket.destroy();
    });
  } else {
    logger.warn(`Rejected WebSocket upgrade request for unknown path: ${req.url}`);
    socket.destroy();
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error("Gateway error caught:", { error: err.message, stack: err.stack });
  return errorResponse(res, err.message || "Gateway Routing Error", 502);
});

server.listen(PORT, () => {
  logger.info(`API Gateway listening on http://localhost:${PORT}`);
});

setupGracefulShutdown({ server, logger });
