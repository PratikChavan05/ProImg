import { Otp } from "../models/userModel.js";
import { createLogger } from "shared";

const logger = createLogger("auth-otp-cleanup");

export const cleanupExpiredOtps = async () => {
  const result = await Otp.deleteMany({ expiresAt: { $lt: new Date() } });
  if (result.deletedCount > 0) {
    logger.info(`Removed ${result.deletedCount} expired OTP sessions`);
  }
  return result.deletedCount;
};
