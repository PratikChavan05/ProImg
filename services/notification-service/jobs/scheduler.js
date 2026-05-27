import cron from "node-cron";
import { createLogger } from "shared";
import { cleanupOldNotifications } from "./cleanupNotifications.js";
import { runWeeklyDigest } from "./weeklyDigest.js";

const logger = createLogger("notification-scheduler");

const isFastCron = () =>
  process.env.CRON_FAST === "true" || process.env.NODE_ENV === "development";

/** Run all scheduled jobs once (for testing). */
export const runScheduledJobsOnce = async () => {
  const retention = Number(process.env.NOTIFICATION_RETENTION_DAYS);
  const retentionDays = Number.isFinite(retention)
    ? retention
    : isFastCron()
      ? 0
      : 30;

  logger.info("[cron] Running cleanup + digest now…");
  const removed = await cleanupOldNotifications(retentionDays);
  const digestUsers = await runWeeklyDigest();
  logger.info("[cron] Done", { removed, digestUsers });
  return { removed, digestUsers, retentionDays };
};

export const startScheduler = () => {
  const tz = process.env.CRON_TZ || "UTC";
  const fast = isFastCron();

  const cleanupCron = fast ? "*/2 * * * *" : "0 3 * * *";
  const digestCron = fast ? "*/3 * * * *" : "0 9 * * 1";
  const heartbeatCron = fast ? "*/1 * * * *" : "0 * * * *";

  cron.schedule(
    cleanupCron,
    async () => {
      try {
        const retention = Number(process.env.NOTIFICATION_RETENTION_DAYS);
        const days = Number.isFinite(retention) ? retention : fast ? 0 : 30;
        await cleanupOldNotifications(days);
      } catch (err) {
        logger.error("cleanupOldNotifications failed", { error: err.message });
      }
    },
    { timezone: tz }
  );

  cron.schedule(
    digestCron,
    async () => {
      try {
        await runWeeklyDigest();
      } catch (err) {
        logger.error("runWeeklyDigest failed", { error: err.message });
      }
    },
    { timezone: tz }
  );

  cron.schedule(heartbeatCron, () => {
    logger.info("Notification scheduler heartbeat");
  });

  if (fast) {
    logger.warn(
      `CRON_FAST mode: cleanup ${cleanupCron}, digest ${digestCron}, heartbeat ${heartbeatCron} (${tz})`
    );
    setTimeout(() => {
      runScheduledJobsOnce().catch((err) =>
        logger.error("Startup cron test run failed", { error: err.message })
      );
    }, 8000);
  } else {
    logger.info(`Cron jobs registered (timezone: ${tz})`);
  }

  return { fast, cleanupCron, digestCron, heartbeatCron, timezone: tz };
};
