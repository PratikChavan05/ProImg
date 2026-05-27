import { Notification } from "../models/notificationModel.js";
import { sendEmail } from "./emailService.js";
import { createLogger } from "shared";

const logger = createLogger("notification-handlers");

const idStr = (id) => id?.toString?.() ?? String(id);

const skipSelf = (actorId, recipientId) =>
  actorId && recipientId && idStr(actorId) === idStr(recipientId);

export const handleEmailNotification = async (payload) => {
  const { data, correlationId } = payload;
  const { email, subject, text } = data;

  if (!email || !subject || !text) {
    throw new Error("Invalid notification.triggered payload");
  }

  await sendEmail({ email, subject, text, correlationId });
};

export const handleSocialActivity = async (payload) => {
  const { data, correlationId } = payload;
  const {
    type,
    recipientId,
    recipientEmail,
    actorId,
    actorName,
    title,
    body,
    message,
    link,
    entityType,
    entityId,
    sendEmail: shouldEmail = false
  } = data;

  if (!recipientId || !type) {
    logger.warn("social.activity missing recipientId or type", { data });
    return;
  }

  if (skipSelf(actorId, recipientId)) return;

  const doc = await Notification.create({
    userId: recipientId,
    type,
    title: title || "New activity",
    body: body || message || "",
    link: link || "/",
    actorId: actorId || null,
    actorName: actorName || "",
    entityType: entityType || null,
    entityId: entityId || null,
    read: false,
    emailSent: false
  });

  logger.info(`In-app notification created [${type}] for user ${recipientId}`, {
    correlationId,
    notificationId: doc._id
  });

  if (shouldEmail && recipientEmail) {
    try {
      await sendEmail({
        email: recipientEmail,
        subject: title || "ProImg — new activity",
        text: `${body || message}\n\nOpen: ${process.env.CLIENT_URL || "http://localhost:5173"}${link}`,
        correlationId
      });
      doc.emailSent = true;
      await doc.save();
    } catch (err) {
      logger.error("Failed to send activity email", { error: err.message });
    }
  }
};

export const handleMessageReceived = async (payload) => {
  const { data, correlationId } = payload;
  const {
    recipientId,
    recipientEmail,
    senderId,
    senderName,
    preview,
    conversationLink
  } = data;

  if (!recipientId || !senderId) return;
  if (skipSelf(senderId, recipientId)) return;

  let displayPreview = preview || "You have a new message";
  try {
    const parsed = JSON.parse(displayPreview);
    if (parsed && parsed.isEncrypted) {
      displayPreview = "🔒 End-to-End Encrypted Message";
    }
  } catch (e) {
    // Plaintext fallback
  }

  await handleSocialActivity({
    ...payload,
    data: {
      type: "message",
      recipientId,
      recipientEmail,
      actorId: senderId,
      actorName: senderName,
      title: `New message from ${senderName}`,
      body: displayPreview,
      link: conversationLink || `/messages/${senderId}`,
      entityType: "message",
      entityId: senderId,
      sendEmail: Boolean(recipientEmail)
    },
    correlationId
  });
};
