import { Notification } from "../models/notificationModel.js";
import { AppError, successResponse } from "shared";

const idStr = (id) => id?.toString?.() ?? String(id);

export const listNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const unreadOnly = req.query.unread === "true";

    const filter = { userId };
    if (unreadOnly) filter.read = false;

    const [items, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId, read: false })
    ]);

    return successResponse(res, {
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      unreadCount
    });
  } catch (err) {
    next(err);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user.id,
      read: false
    });
    return successResponse(res, { count });
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const doc = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!doc) throw new AppError("Notification not found", 404);

    doc.read = true;
    await doc.save();

    return successResponse(res, doc, "Marked as read");
  } catch (err) {
    next(err);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user.id, read: false },
      { $set: { read: true } }
    );
    return successResponse(res, { modified: result.modifiedCount }, "All marked as read");
  } catch (err) {
    next(err);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const doc = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!doc) throw new AppError("Notification not found", 404);

    return successResponse(res, {}, "Notification deleted");
  } catch (err) {
    next(err);
  }
};
