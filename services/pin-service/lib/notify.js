import { publishSocialActivity } from "shared";
import { UserReplica } from "../models/pinModel.js";

const ownerIdStr = (owner) => (owner?._id || owner)?.toString();

export const notifyPinOwner = async (req, pin, { type, actorName, body }) => {
  const ownerId = ownerIdStr(pin.owner);
  const actorId = req.user.id?.toString?.() ?? String(req.user.id);

  if (!ownerId || ownerId === actorId) return;

  const owner = await UserReplica.findById(ownerId).select("email name");

  await publishSocialActivity(req.rabbitClient, req.correlationId, {
    type,
    recipientId: ownerId,
    recipientEmail: owner?.email,
    actorId,
    actorName: actorName || "Someone",
    title:
      type === "like"
        ? `${actorName} liked your pin`
        : `${actorName} commented on your pin`,
    body: body || pin.title,
    link: `/pin/${pin._id}`,
    entityType: "pin",
    entityId: pin._id
  });
};
