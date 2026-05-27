import { mongoose } from "shared";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isPrivate: {
      type: Boolean,
      default: false,
    },
    followRequests: [
      {
        from: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    publicKey: {
      type: Object,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Otp schema for stateless verification
const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true
    },
    name: String,       // Stored temporarily during registration flow
    password: String,   // Stored temporarily during registration flow
    otp: {
      type: String,
      required: true
    },
    token: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // Auto-delete document after expiration
    }
  },
  {
    timestamps: true
  }
);

export const User = mongoose.model("User", userSchema);
export const Otp = mongoose.model("Otp", otpSchema);
