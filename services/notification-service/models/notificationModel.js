import { mongoose } from "shared";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: [
        "like",
        "comment",
        "follow",
        "follow_request",
        "follow_accepted",
        "message",
        "system",
        "digest"
      ],
      required: true
    },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    link: { type: String, default: "/" },
    actorId: { type: mongoose.Schema.Types.ObjectId, default: null },
    actorName: { type: String, default: "" },
    entityType: { type: String, enum: ["pin", "user", "message", null], default: null },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    read: { type: Boolean, default: false, index: true },
    emailSent: { type: Boolean, default: false }
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }); // TTL 90 days

export const Notification = mongoose.model("Notification", notificationSchema);
