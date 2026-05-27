import { UserReplica } from "../models/pinModel.js";

const idStr = (id) => (id?._id || id)?.toString();

export const canViewOwnerContent = async (viewerId, ownerId) => {
  if (!ownerId) return false;
  if (idStr(viewerId) === idStr(ownerId)) return true;

  const owner = await UserReplica.findById(ownerId).select("isPrivate followers");
  if (!owner) return true;
  if (!owner.isPrivate) return true;

  return (owner.followers || []).some((f) => idStr(f) === idStr(viewerId));
};
