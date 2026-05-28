import crypto from "crypto";
import { User } from "../models/userModel.js";
import { successResponse, AppError } from "shared";

// Re-use userControllers publish replica
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
      isPrivate: Boolean(user.isPrivate),
      isPremium: Boolean(user.isPremium)
    },
    correlationId
  );
};

export const createOrder = async (req, res, next) => {
  try {
    const amount = 2; // Amount in INR
    const keyId = process.env.RAZORPAY_KEY_ID || "rzp_test_ProImgKey123";
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "ProImgSecret123456789";

    // If using the simulated keys or if Razorpay is not configured, return a mock order
    if (keyId === "rzp_test_ProImgKey123" || !process.env.RAZORPAY_KEY_SECRET) {
      const mockOrder = {
        id: `order_mock_${crypto.randomBytes(8).toString("hex")}`,
        entity: "order",
        amount: amount * 100,
        amount_paid: 0,
        amount_due: amount * 100,
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        status: "created",
        attempts: 0,
        created_at: Math.floor(Date.now() / 1000),
        simulated: true
      };
      return successResponse(res, { order: mockOrder, keyId }, "Simulated order created successfully");
    }

    // Call real Razorpay API
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`
      },
      body: JSON.stringify({
        amount: amount * 100, // Razorpay amounts are in paise (e.g. 49900 paise = 499 INR)
        currency: "INR",
        receipt: `receipt_${Date.now()}`
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new AppError(`Razorpay Order creation failed: ${errBody}`, 400);
    }

    const order = await response.json();
    return successResponse(res, { order, keyId }, "Razorpay order created successfully");
  } catch (err) {
    next(err);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, simulated } = req.body;

    if (simulated || razorpay_order_id?.startsWith("order_mock_")) {
      // Handle simulated/bypass validation for developer testing
      const user = await User.findById(req.user.id);
      if (!user) {
        throw new AppError("User not found", 404);
      }

      user.isPremium = true;
      await user.save();

      // Publish to RabbitMQ
      await publishUserReplica(req.rabbitClient, req.correlationId, user);

      // Trigger an in-app notification to the user about their Pro subscription status
      await req.rabbitClient.publish("notification.triggered", {
        email: user.email,
        subject: "Welcome to ProImg Pro",
        text: `Dear ${user.name}, your ProImg Pro subscription is now active. Thank you for supporting our platform! You now have access to verified badge highlights, priority messaging signaling, and E2E encrypted features.`,
        type: "system"
      }, req.correlationId);

      return successResponse(res, { user: { _id: user._id, name: user.name, email: user.email, isPremium: true } }, "Simulated payment verified and premium activated!");
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new AppError("Payment details (order_id, payment_id, signature) are required", 400);
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      throw new AppError("Razorpay key secret not configured on server", 500);
    }

    // Verify signature
    const generated_signature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      throw new AppError("Payment signature verification failed. Transaction was not authenticated.", 400);
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    user.isPremium = true;
    await user.save();

    // Publish to RabbitMQ
    await publishUserReplica(req.rabbitClient, req.correlationId, user);

    // Trigger email/notification
    await req.rabbitClient.publish("notification.triggered", {
      email: user.email,
      subject: "Welcome to ProImg Pro",
      text: `Dear ${user.name}, your ProImg Pro subscription is now active. Thank you for supporting our platform! You now have access to verified badge highlights, priority messaging signaling, and E2E encrypted features.`,
      type: "system"
    }, req.correlationId);

    return successResponse(res, { user: { _id: user._id, name: user.name, email: user.email, isPremium: true } }, "Payment verified and premium activated successfully!");
  } catch (err) {
    next(err);
  }
};

export const cancelPremium = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    user.isPremium = false;
    await user.save();

    // Publish to RabbitMQ
    await publishUserReplica(req.rabbitClient, req.correlationId, user);

    return successResponse(res, { user: { _id: user._id, name: user.name, email: user.email, isPremium: false } }, "Premium membership cancelled. Restored to standard account.");
  } catch (err) {
    next(err);
  }
};
