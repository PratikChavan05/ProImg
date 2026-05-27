import crypto from "crypto";
import jwt from "jsonwebtoken";
import validator from "validator";
import { User, Otp } from "../models/userModel.js";
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  AppError,
  successResponse,
  publishSocialActivity
} from "shared";
import {
  idStr,
  getRelationship,
  canViewFullProfile,
  formatUserForViewer,
  areMutualFriends
} from "../lib/profileAccess.js";

const publishUserReplica = async (rabbitClient, correlationId, user) => {
  if (!rabbitClient || !user) return;
  await rabbitClient.publish(
    "user.updated",
    {
      id: user._id,
      name: user.name,
      email: user.email,
      following: user.following || [],
      followers: user.followers || [],
      isPrivate: Boolean(user.isPrivate)
    },
    correlationId
  );
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie("token", accessToken, {
    path: "/",
    maxAge: 60 * 60 * 1000, // 1 hour access token
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
  });

  res.cookie("refreshToken", refreshToken, {
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days refresh token
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
  });
};

// Register OTP Initiation
export const registerWithOtp = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw new AppError("All fields (name, email, password) are required", 400);
    }

    if (!validator.isEmail(email)) {
      throw new AppError("Invalid email format", 400);
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError("An account with this email already exists", 400);
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const token = jwt.sign({ email }, process.env.JWT_SEC || "secret_key", { expiresIn: "5m" });

    // Store in stateless Otp schema
    await Otp.findOneAndUpdate(
      { email },
      {
        name,
        password, // password will be hashed on verification step
        otp,
        token,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      },
      { upsert: true, new: true }
    );

    // Publish email event to RabbitMQ
    await req.rabbitClient.publish("notification.triggered", {
      email,
      subject: "Welcome to ProImg - Register OTP",
      text: `Your registration OTP is: ${otp}. It will expire in 5 minutes.`,
      type: "otp"
    }, req.correlationId);

    return successResponse(res, { token }, "OTP sent successfully. Please verify to complete registration.");
  } catch (err) {
    next(err);
  }
};

// Verify OTP & Create User
export const verifyOtpAndRegister = async (req, res, next) => {
  try {
    const { otp } = req.body;
    const { token } = req.params;

    if (!otp || !token) {
      throw new AppError("OTP and token are required", 400);
    }

    let email;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SEC || "secret_key");
      email = decoded.email;
    } catch (err) {
      throw new AppError("Invalid or expired verification token", 400);
    }

    const tempOtp = await Otp.findOne({ email });
    if (!tempOtp || tempOtp.token !== token) {
      throw new AppError("No verification session found for this email", 400);
    }

    if (tempOtp.expiresAt < new Date()) {
      await Otp.deleteOne({ email });
      throw new AppError("OTP expired", 400);
    }

    if (tempOtp.otp !== otp.toString()) {
      throw new AppError("Invalid OTP code", 400);
    }

    const hashedPassword = await hashPassword(tempOtp.password);
    const user = await User.create({
      name: tempOtp.name,
      email,
      password: hashedPassword
    });

    // Delete temp OTP session
    await Otp.deleteOne({ email });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    setAuthCookies(res, accessToken, refreshToken);

    // Publish User Registered Event to RabbitMQ for eventual consistency
    await req.rabbitClient.publish("user.registered", {
      id: user._id,
      name: user.name,
      email: user.email,
      following: user.following || []
    }, req.correlationId);

    return successResponse(res, {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email
      }
    }, "User registered successfully", 201);
  } catch (err) {
    next(err);
  }
};

// Login User
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError("Email and password are required", 400);
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError("Invalid Email or Password", 400);
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      throw new AppError("Invalid Email or Password", 400);
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    setAuthCookies(res, accessToken, refreshToken);

    return successResponse(res, {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email
      }
    }, "Logged In successfully");
  } catch (err) {
    next(err);
  }
};

// Refresh Auth Token Mechanism
export const refreshAuthToken = async (req, res, next) => {
  try {
    const rfToken = req.cookies.refreshToken;
    if (!rfToken) {
      throw new AppError("Refresh token missing. Please login again.", 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(rfToken, process.env.REFRESH_TOKEN_SEC || "refresh_secret_key");
    } catch (err) {
      throw new AppError("Invalid or expired refresh token", 401);
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      throw new AppError("User not found", 401);
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    setAuthCookies(res, newAccessToken, newRefreshToken);

    return successResponse(res, {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email
      }
    }, "Token refreshed successfully");
  } catch (err) {
    next(err);
  }
};

// Forget Password Initiate
export const forgetPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !validator.isEmail(email)) {
      throw new AppError("Valid email is required", 400);
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError("No account found with this email", 400);
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const token = jwt.sign({ email }, process.env.JWT_SEC || "secret_key", { expiresIn: "5m" });

    await Otp.findOneAndUpdate(
      { email },
      {
        otp,
        token,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      },
      { upsert: true, new: true }
    );

    // Publish to RabbitMQ
    await req.rabbitClient.publish("notification.triggered", {
      email,
      subject: "ProImg - Password Reset Code",
      text: `Your password reset OTP is: ${otp}. It will expire in 5 minutes.`,
      type: "reset"
    }, req.correlationId);

    return successResponse(res, { token }, "OTP sent successfully.");
  } catch (err) {
    next(err);
  }
};

// Reset Password Complete
export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { otp, password } = req.body;

    if (!password || !otp || !token) {
      throw new AppError("Password, OTP, and token are required", 400);
    }

    let email;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SEC || "secret_key");
      email = decoded.email;
    } catch (err) {
      throw new AppError("Invalid or expired token", 400);
    }

    const tempOtp = await Otp.findOne({ email });
    if (!tempOtp || tempOtp.token !== token) {
      throw new AppError("No OTP request session found", 400);
    }

    if (tempOtp.expiresAt < new Date()) {
      await Otp.deleteOne({ email });
      throw new AppError("OTP expired", 400);
    }

    if (tempOtp.otp !== otp.toString()) {
      throw new AppError("Invalid OTP code", 400);
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError("User not found", 404);
    }

    user.password = await hashPassword(password);
    await user.save();

    await Otp.deleteOne({ email });

    return successResponse(res, {}, "Password reset successfully");
  } catch (err) {
    next(err);
  }
};

// Log Out User
export const logOutUser = async (req, res, next) => {
  try {
    res.clearCookie("token", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
    });
    res.clearCookie("refreshToken", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
    });

    return successResponse(res, {}, "Logged out successfully");
  } catch (err) {
    next(err);
  }
};

// Get My Profile
export const myProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      throw new AppError("User profile not found", 404);
    }
    const payload = formatUserForViewer(user, req.user.id);
    return successResponse(res, payload);
  } catch (err) {
    next(err);
  }
};

// Get Any User Profile
export const userProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      throw new AppError("User not found", 404);
    }
    const viewer = await User.findById(req.user.id).select("followers following");
    const payload = formatUserForViewer(user, req.user.id, viewer);
    return successResponse(res, payload);
  } catch (err) {
    next(err);
  }
};

// Toggle private account
export const updatePrivacy = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (typeof req.body.isPrivate !== "boolean") {
      throw new AppError("isPrivate must be a boolean", 400);
    }

    user.isPrivate = Boolean(req.body.isPrivate);
    await user.save();
    await publishUserReplica(req.rabbitClient, req.correlationId, user);

    const profile = formatUserForViewer(user, req.user.id);

    return successResponse(
      res,
      { isPrivate: user.isPrivate, user: profile },
      user.isPrivate ? "Account is now private" : "Account is now public"
    );
  } catch (err) {
    next(err);
  }
};

// Incoming follow requests (for private accounts)
export const getFollowRequests = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select("followRequests")
      .populate("followRequests.from", "name email");

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const requests = (user.followRequests || []).map((r) => ({
      _id: r._id,
      createdAt: r.createdAt,
      user: r.from
    }));

    return successResponse(res, requests);
  } catch (err) {
    next(err);
  }
};

export const acceptFollowRequest = async (req, res, next) => {
  try {
    const requesterId = req.params.requesterId;
    const targetUser = await User.findById(req.user.id);
    const requester = await User.findById(requesterId);

    if (!targetUser || !requester) {
      throw new AppError("User not found", 404);
    }

    const hasRequest = (targetUser.followRequests || []).some(
      (r) => idStr(r.from) === idStr(requesterId)
    );
    if (!hasRequest) {
      throw new AppError("Follow request not found", 404);
    }

    targetUser.followRequests = targetUser.followRequests.filter(
      (r) => idStr(r.from) !== idStr(requesterId)
    );

    if (!targetUser.followers.some((id) => idStr(id) === idStr(requesterId))) {
      targetUser.followers.push(requesterId);
    }
    if (!requester.following.some((id) => idStr(id) === idStr(targetUser._id))) {
      requester.following.push(targetUser._id);
    }

    await targetUser.save();
    await requester.save();

    await publishUserReplica(req.rabbitClient, req.correlationId, targetUser);
    await publishUserReplica(req.rabbitClient, req.correlationId, requester);

    await publishSocialActivity(req.rabbitClient, req.correlationId, {
      type: "follow_accepted",
      recipientId: requesterId,
      recipientEmail: requester.email,
      actorId: targetUser._id,
      actorName: targetUser.name,
      title: `${targetUser.name} accepted your follow request`,
      body: "You can now see their pins.",
      link: `/user/${targetUser._id}`,
      entityType: "user",
      entityId: targetUser._id
    });

    return successResponse(res, {
      requesterId,
      followersCount: targetUser.followers.length
    }, "Follow request accepted");
  } catch (err) {
    next(err);
  }
};

export const rejectFollowRequest = async (req, res, next) => {
  try {
    const requesterId = req.params.requesterId;
    const targetUser = await User.findById(req.user.id);

    if (!targetUser) {
      throw new AppError("User not found", 404);
    }

    const before = targetUser.followRequests.length;
    targetUser.followRequests = targetUser.followRequests.filter(
      (r) => idStr(r.from) !== idStr(requesterId)
    );

    if (targetUser.followRequests.length === before) {
      throw new AppError("Follow request not found", 404);
    }

    await targetUser.save();

    return successResponse(res, {}, "Follow request declined");
  } catch (err) {
    next(err);
  }
};

// Follow / Unfollow / Request (private accounts)
export const followAndUnfollow = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const loggedInUserId = req.user.id;

    if (idStr(targetUserId) === idStr(loggedInUserId)) {
      throw new AppError("You cannot follow yourself", 400);
    }

    const targetUser = await User.findById(targetUserId);
    const loggedInUser = await User.findById(loggedInUserId);

    if (!targetUser || !loggedInUser) {
      throw new AppError("User not found", 404);
    }

    const isFollowing = targetUser.followers.some(
      (id) => idStr(id) === idStr(loggedInUserId)
    );
    const hasRequested = (targetUser.followRequests || []).some(
      (r) => idStr(r.from) === idStr(loggedInUserId)
    );

    const respond = (payload, message) =>
      successResponse(res, {
        following: loggedInUser.following,
        targetFollowersCount: targetUser.followers.length,
        relationship: getRelationship(targetUser, loggedInUserId),
        ...payload
      }, message);

    if (isFollowing) {
      targetUser.followers = targetUser.followers.filter(
        (id) => idStr(id) !== idStr(loggedInUserId)
      );
      loggedInUser.following = loggedInUser.following.filter(
        (id) => idStr(id) !== idStr(targetUserId)
      );
      await targetUser.save();
      await loggedInUser.save();

      await publishUserReplica(req.rabbitClient, req.correlationId, targetUser);
      await publishUserReplica(req.rabbitClient, req.correlationId, loggedInUser);

      return respond(
        { followStatus: "none", isFollowing: false, isRequested: false },
        "Unfollowed successfully"
      );
    }

    if (hasRequested) {
      targetUser.followRequests = targetUser.followRequests.filter(
        (r) => idStr(r.from) !== idStr(loggedInUserId)
      );
      await targetUser.save();

      return respond(
        { followStatus: "none", isFollowing: false, isRequested: false },
        "Follow request cancelled"
      );
    }

    if (Boolean(targetUser.isPrivate)) {
      const alreadyQueued = targetUser.followRequests.some(
        (r) => idStr(r.from) === idStr(loggedInUserId)
      );
      if (!alreadyQueued) {
        targetUser.followRequests.push({ from: loggedInUserId });
      }
      await targetUser.save();

      await publishSocialActivity(req.rabbitClient, req.correlationId, {
        type: "follow_request",
        recipientId: targetUserId,
        recipientEmail: targetUser.email,
        actorId: loggedInUserId,
        actorName: loggedInUser.name,
        title: `${loggedInUser.name} requested to follow you`,
        body: "Review follow requests on your account.",
        link: "/account",
        entityType: "user",
        entityId: loggedInUserId
      });

      return respond(
        { followStatus: "requested", isFollowing: false, isRequested: true },
        "Follow request sent"
      );
    }

    targetUser.followers.push(loggedInUserId);
    loggedInUser.following.push(targetUserId);
    await targetUser.save();
    await loggedInUser.save();

    await publishUserReplica(req.rabbitClient, req.correlationId, targetUser);
    await publishUserReplica(req.rabbitClient, req.correlationId, loggedInUser);

    await publishSocialActivity(req.rabbitClient, req.correlationId, {
      type: "follow",
      recipientId: targetUserId,
      recipientEmail: targetUser.email,
      actorId: loggedInUserId,
      actorName: loggedInUser.name,
      title: `${loggedInUser.name} started following you`,
      link: `/user/${loggedInUserId}`,
      entityType: "user",
      entityId: loggedInUserId
    });

    return respond(
      { followStatus: "following", isFollowing: true, isRequested: false },
      "Followed successfully"
    );
  } catch (err) {
    next(err);
  }
};

// Get User Connections (Followers & Following)
export const getUserFollowersAndFollowing = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("followers", "name email")
      .populate("following", "name email");

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (!canViewFullProfile(user, req.user.id)) {
      throw new AppError("This account is private", 403);
    }

    const viewerId = req.user.id;
    const enrichWithRelationship = async (list) => {
      const plain = (list || []).map((u) => (u.toObject ? u.toObject() : { ...u }));
      const ids = plain.map((u) => u._id).filter(Boolean);
      if (!ids.length) return [];

      const profiles = await User.find({ _id: { $in: ids } }).select(
        "name email followers following followRequests"
      );
      const byId = new Map(profiles.map((p) => [idStr(p._id), p]));

      const viewer = await User.findById(viewerId).select("followers following");

      return plain.map((u) => {
        const profile = byId.get(idStr(u._id)) || u;
        return {
          _id: u._id,
          name: u.name,
          email: u.email,
          relationship: getRelationship(profile, viewerId),
          canMessage: viewer ? areMutualFriends(viewer, profile) : false
        };
      });
    };

    return successResponse(res, {
      followers: await enrichWithRelationship(user.followers),
      following: await enrichWithRelationship(user.following)
    });
  } catch (err) {
    next(err);
  }
};

// Get All Users
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("name email isPrivate followers followRequests following");
    const viewerId = req.user.id;
    const viewer = await User.findById(viewerId).select("followers following");

    const list = users
      .filter((u) => idStr(u._id) !== idStr(viewerId))
      .map((u) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        isPrivate: Boolean(u.isPrivate),
        relationship: getRelationship(u, viewerId),
        canMessage: viewer ? areMutualFriends(viewer, u) : false
      }));

    return successResponse(res, list);
  } catch (err) {
    next(err);
  }
};

// Publish all users to RabbitMQ so pin/chat services sync replicas (run once after deploy)
export const syncUserReplicas = async (req, res, next) => {
  try {
    const users = await User.find().select("name email following followers isPrivate");
    for (const user of users) {
      await req.rabbitClient.publish(
        "user.registered",
        {
          id: user._id,
          name: user.name,
          email: user.email,
          following: user.following || [],
          followers: user.followers || [],
          isPrivate: Boolean(user.isPrivate)
        },
        req.correlationId
      );
    }
    return successResponse(
      res,
      { count: users.length },
      `Synced ${users.length} users to message bus`
    );
  } catch (err) {
    next(err);
  }
};

// Upload JWK Public Key for E2EE
export const uploadPublicKey = async (req, res, next) => {
  try {
    const { publicKey } = req.body;
    if (!publicKey) {
      throw new AppError("Public key is required", 400);
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    user.publicKey = publicKey;
    await user.save();

    return successResponse(res, { publicKey: user.publicKey }, "Public key updated successfully");
  } catch (err) {
    next(err);
  }
};
