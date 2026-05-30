import express from "express";
import passport from "passport";
import { isAuth, optionalAuth } from "shared";
import {
  registerWithOtp,
  verifyOtpAndRegister,
  loginUser,
  refreshAuthToken,
  forgetPassword,
  resetPassword,
  logOutUser,
  myProfile,
  userProfile,
  followAndUnfollow,
  getUserFollowersAndFollowing,
  getAllUsers,
  updatePrivacy,
  getFollowRequests,
  acceptFollowRequest,
  rejectFollowRequest,
  syncUserReplicas,
  uploadPublicKey
} from "../controllers/userControllers.js";
import { createOrder, verifyPayment, cancelPremium } from "../controllers/paymentController.js";
import { generateAccessToken, generateRefreshToken } from "shared";
import { getRabbitClient } from "../lib/rabbitHolder.js";

const router = express.Router();

router.post("/register", registerWithOtp);
router.post("/verifyOtp/:token", verifyOtpAndRegister);
router.post("/login", loginUser);
router.post("/refresh", refreshAuthToken); // Access token refresh route
router.post("/forget", forgetPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/keys", isAuth, uploadPublicKey);
router.get("/logout", isAuth, logOutUser);
router.get("/me", isAuth, myProfile);
router.get("/all", isAuth, getAllUsers);
router.post("/sync-replicas", isAuth, syncUserReplicas);
router.patch("/privacy", isAuth, updatePrivacy);
router.get("/follow-requests", isAuth, getFollowRequests);
router.post("/follow-requests/:requesterId/accept", isAuth, acceptFollowRequest);
router.post("/follow-requests/:requesterId/reject", isAuth, rejectFollowRequest);
router.get("/get/:id", isAuth, getUserFollowersAndFollowing);
router.post("/follow/:id", isAuth, followAndUnfollow);
router.post("/payment/order", isAuth, createOrder);
router.post("/payment/verify", isAuth, verifyPayment);
router.post("/payment/cancel", isAuth, cancelPremium);
router.get("/:id", optionalAuth, userProfile);

// Google OAuth
router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/", session: false }),
  async (req, res) => {
    const rabbitClient = getRabbitClient();
    const isNew = req.authInfo?.isNew;

    if (rabbitClient) {
      const payload = {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        following: req.user.following || [],
      };
      await rabbitClient.publish(
        isNew ? "user.registered" : "user.updated",
        payload,
        `google-oauth-${req.user._id}`
      );
    }

    const accessToken = generateAccessToken(req.user);
    const refreshToken = generateRefreshToken(req.user);

    res.cookie("token", accessToken, {
      path: "/",
      maxAge: 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
    });

    res.cookie("refreshToken", refreshToken, {
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
    });

    // Redirect back to frontend dashboard
    res.redirect(process.env.CLIENT_URL || "http://localhost:5173");
  }
);

export default router;
