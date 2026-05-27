import express from "express";
import multer from "multer";
import { isAuth } from "shared";
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
  getSinglePin,
  getViews,
  likeAndUnlike,
  myLikes,
  updatePin
} from "../controllers/pinControllers.js";

const router = express.Router();

// Configure Multer memory storage for direct Cloudinary streaming
const storage = multer.memoryStorage();
const uploadFile = multer({ storage }).single("file");

router.post("/new", isAuth, uploadFile, createPin);
router.get("/all", isAuth, getAllPins);
router.get("/feed", isAuth, getFeedPins);
router.get("/user/:ownerId", isAuth, getPinsByUser);
router.get("/:id", isAuth, getSinglePin);
router.put("/:id", isAuth, updatePin);
router.delete("/:id", isAuth, deletePin);
router.post("/comment/:id", isAuth, commentOnPin);
router.delete("/comment/:id", isAuth, deleteComment);
router.post("/like/:id", isAuth, likeAndUnlike);
router.get("/likes/:id", isAuth, getLikes);
router.get("/liked/:id", isAuth, myLikes);
router.post("/view", isAuth, countViews);
router.get("/getView/:id", isAuth, getViews);

export default router;
