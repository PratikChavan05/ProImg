import mongoose from "mongoose";

// Single mongoose instance for all services — import { mongoose } from "shared" in models
export { mongoose };

export const connectDatabase = async (mongoUri, logger) => {
  if (!mongoUri) {
    logger.error("MongoDB URI is missing in configuration!");
    process.exit(1);
  }

  const connectWithRetry = async () => {
    logger.info("Attempting MongoDB connection...");
    try {
      await mongoose.connect(mongoUri, {
        autoIndex: true
      });
      logger.info("Successfully connected to MongoDB.");
    } catch (err) {
      logger.error("MongoDB connection failed, retrying in 5 seconds...", { error: err.message });
      setTimeout(connectWithRetry, 5000);
    }
  };

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB connection lost. Attempting reconnection...");
  });

  mongoose.connection.on("error", (err) => {
    logger.error("MongoDB connection error:", { error: err.message });
  });

  await connectWithRetry();
};
