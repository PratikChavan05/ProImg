import cron from "node-cron";
import { createLogger } from "shared";
import { cleanupExpiredOtps } from "./otpCleanup.js";

const logger = createLogger("auth-scheduler");

export const startAuthScheduler = () => {
  const tz = process.env.CRON_TZ || "UTC";

  // Every 15 minutes — delete expired OTP records
  cron.schedule(
    "*/15 * * * *",
    async () => {
      try {
        await cleanupExpiredOtps();
      } catch (err) {
        logger.error("OTP cleanup failed", { error: err.message });
      }
    },
    { timezone: tz }
  );

  logger.info(`Auth cron registered (OTP cleanup every 15m, tz: ${tz})`);
};
