import winston from "winston";

const { combine, timestamp, json, colorize, printf } = winston.format;

// Format correlation ID and service name
const logFormat = printf(({ level, message, timestamp, service, correlationId, ...metadata }) => {
  let msg = `[${timestamp}] [${service || "unknown-service"}]`;
  if (correlationId) {
    msg += ` [CorrelationID: ${correlationId}]`;
  }
  msg += ` ${level}: ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

export const createLogger = (serviceName) => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    defaultMeta: { service: serviceName },
    format: combine(
      timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.errors({ stack: true }),
      process.env.NODE_ENV === "production" ? json() : combine(colorize(), logFormat)
    ),
    transports: [
      new winston.transports.Console()
    ]
  });
};
