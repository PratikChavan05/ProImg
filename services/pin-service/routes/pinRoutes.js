import express from "express";
import multer from "multer";
import { isAuth, optionalAuth } from "shared";
import {
  commentOnPin,
  countViews,
  createPin,
  deleteComment,
  deletePin,
  getAllPins,
  getFeedPins,
  getPinsByUser,
  getLikes,
  getSimilarPins,
  getSinglePin,
  getViews,
  likeAndUnlike,
  myLikes,
  updatePin
} from "../controllers/pinControllers.js";

const router = express.Router();

import fs from "fs";

// Ensure upload directory exists locally
if (!fs.existsSync("./uploads")) {
  fs.mkdirSync("./uploads");
}

// Configure Multer disk storage for memory-safe direct streaming
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + "-" + file.originalname);
  }
});
const uploadFile = multer({ storage }).single("file");

router.post("/new", isAuth, uploadFile, createPin);
router.get("/all", optionalAuth, getAllPins);
router.get("/feed", isAuth, getFeedPins);
router.get("/user/:ownerId", optionalAuth, getPinsByUser);
router.get("/:id", optionalAuth, getSinglePin);
router.put("/:id", isAuth, updatePin);
router.delete("/:id", isAuth, deletePin);
router.post("/comment/:id", isAuth, commentOnPin);
router.delete("/comment/:id", isAuth, deleteComment);
router.post("/like/:id", isAuth, likeAndUnlike);
router.get("/likes/:id", isAuth, getLikes);
router.get("/liked/:id", isAuth, myLikes);
router.post("/view", isAuth, countViews);
router.get("/getView/:id", isAuth, getViews);
router.get("/:id/similar", optionalAuth, getSimilarPins);

export default router;
