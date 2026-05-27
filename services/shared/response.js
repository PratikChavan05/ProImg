import crypto from "crypto";

// Unified success response structure
export const successResponse = (res, data = {}, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

// Unified error response structure
export const errorResponse = (res, message = "Internal Server Error", statusCode = 500, errors = null, correlationId = null) => {
  const cId = correlationId || crypto.randomUUID();
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    correlationId: cId
  });
};

// Global error handler middleware
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "An unexpected error occurred";
  const correlationId = req.correlationId || crypto.randomUUID();

  // Log error stack securely
  const logger = req.logger || console;
  logger.error(`${message}`, {
    stack: err.stack,
    statusCode,
    correlationId,
    path: req.originalUrl,
    method: req.method
  });

  return errorResponse(
    res,
    process.env.NODE_ENV === "production" ? "Internal Server Error" : message,
    statusCode,
    process.env.NODE_ENV === "production" ? null : err.errors || null,
    correlationId
  );
};

// Custom App Error for clean routing propagation
export class AppError extends Error {
  constructor(message, statusCode, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
