import express from "express";
import { isAuth } from "shared";
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from "../controllers/notificationControllers.js";

const router = express.Router();

router.get("/", isAuth, listNotifications);
router.get("/unread-count", isAuth, getUnreadCount);
router.patch("/read-all", isAuth, markAllAsRead);
router.patch("/:id/read", isAuth, markAsRead);
router.delete("/:id", isAuth, deleteNotification);

export default router;
