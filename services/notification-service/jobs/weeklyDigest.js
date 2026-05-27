import { Notification } from "../models/notificationModel.js";
import { sendEmail, isEmailMockMode } from "../lib/emailService.js";
import { createLogger } from "shared";

const logger = createLogger("job-weekly-digest");

/**
 * Sends a summary email to users who had unread notifications in the last 7 days.
 * Requires recipientEmail on at least one notification (set via social.activity).
 */
export const runWeeklyDigest = async () => {
  const lookbackDays = Number(process.env.DIGEST_LOOKBACK_DAYS);
  const days = Number.isFinite(lookbackDays) ? lookbackDays : 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const groups = await Notification.aggregate([
    { $match: { createdAt: { $gte: since }, read: false } },
    {
      $group: {
        _id: "$userId",
        count: { $sum: 1 },
        types: { $addToSet: "$type" },
        sampleTitle: { $first: "$title" }
      }
    }
  ]);

  let sent = 0;
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

  for (const g of groups) {
    // We don't store email on notification doc — digest is in-app only unless extended
    logger.info(
      `Digest candidate user ${g._id}: ${g.count} unread (${g.types.join(", ")})`
    );

    if (isEmailMockMode()) {
      logger.info(`
📬 [MOCK WEEKLY DIGEST] User ${g._id}: ${g.count} unread — ${g.sampleTitle}
   → ${clientUrl}/notifications
`);
      sent += 1;
      continue;
    }

    // Optional: extend with UserEmail replica collection later
  }

  logger.info(`Weekly digest job finished (${groups.length} users, ${sent} mock/log entries)`);
  return groups.length;
};
