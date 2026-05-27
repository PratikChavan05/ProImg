export function setupGracefulShutdown({ server, mongoose, rabbitClient, logger }) {
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    // 1. Close HTTP server so it stops accepting new requests
    if (server) {
      logger.info("Closing HTTP server...");
      await new Promise((resolve) => {
        server.close((err) => {
          if (err) {
            logger.error("Error closing HTTP server:", { error: err.message });
          } else {
            logger.info("HTTP server closed.");
          }
          resolve();
        });
      });
    }

    // 2. Close RabbitMQ client connections
    if (rabbitClient) {
      logger.info("Closing RabbitMQ connection...");
      if (typeof rabbitClient.close === "function") {
        await rabbitClient.close();
      } else {
        try {
          if (rabbitClient.channel) {
            await rabbitClient.channel.close();
          }
          if (rabbitClient.connection) {
            await rabbitClient.connection.close();
          }
          logger.info("RabbitMQ connection closed.");
        } catch (err) {
          logger.error("Error closing RabbitMQ connection:", { error: err.message });
        }
      }
    }

    // 3. Close Mongoose / Database connection
    if (mongoose && mongoose.connection) {
      logger.info("Closing Mongoose connection...");
      try {
        await mongoose.connection.close();
        logger.info("Mongoose connection closed.");
      } catch (err) {
        logger.error("Error closing Mongoose connection:", { error: err.message });
      }
    }

    logger.info("Graceful shutdown completed. Exiting process.");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection at:", { promise, reason: reason?.stack || reason });
  });

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception caught:", { error: error.message, stack: error.stack });
    shutdown("UNCAUGHT_EXCEPTION");
  });
}
