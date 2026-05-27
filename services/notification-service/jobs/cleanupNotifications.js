import { Notification } from "../models/notificationModel.js";
import { createLogger } from "shared";

const logger = createLogger("job-cleanup-notifications");

/** Remove read notifications older than retentionDays */
export const cleanupOldNotifications = async (retentionDays = 30) => {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const result = await Notification.deleteMany({
    read: true,
    createdAt: { $lt: cutoff }
  });
  logger.info(`Cleanup: removed ${result.deletedCount} read notifications older than ${retentionDays}d`);
  return result.deletedCount;
};
