/** @param {import('mongoose').Types.ObjectId | string} id */
export const idStr = (id) => (id?._id || id)?.toString();

/**
 * @returns {'self' | 'following' | 'requested' | 'none'}
 */
/** Both users follow each other (mutual follow = can message). */
export const areMutualFriends = (userA, userB) => {
  if (!userA || !userB) return false;
  const a = idStr(userA._id);
  const b = idStr(userB._id);
  if (!a || !b || a === b) return false;

  // Instagram-style: userA (viewer) follows userB (target)
  const aFollowsB =
    (userA.following || []).some((id) => idStr(id) === b) ||
    (userB.followers || []).some((id) => idStr(id) === a);

  return aFollowsB;
};

export const getRelationship = (profileUser, viewerId) => {
  if (!profileUser || !viewerId) return "none";
  if (idStr(profileUser._id) === idStr(viewerId)) return "self";

  const isFollower = (profileUser.followers || []).some(
    (f) => idStr(f) === idStr(viewerId)
  );
  if (isFollower) return "following";

  const hasRequested = (profileUser.followRequests || []).some(
    (r) => idStr(r.from) === idStr(viewerId)
  );
  if (hasRequested) return "requested";

  return "none";
};

export const canViewFullProfile = (profileUser, viewerId) => {
  const rel = getRelationship(profileUser, viewerId);
  if (rel === "self" || rel === "following") return true;
  if (!profileUser.isPrivate) return true;
  return false;
};

export const formatUserForViewer = (userDoc, viewerId, viewerDoc = null) => {
  const user = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete user.password;

  const relationship = getRelationship(user, viewerId);
  const canViewContent = canViewFullProfile(user, viewerId);
  const incomingFollowRequestsCount = user.followRequests?.length || 0;
  const canMessage =
    relationship !== "self" && viewerDoc
      ? areMutualFriends(viewerDoc, user)
      : false;

  delete user.followRequests;

  const base = {
    _id: user._id,
    name: user.name,
    isPrivate: Boolean(user.isPrivate),
    isPremium: Boolean(user.isPremium),
    relationship,
    canViewContent,
    canMessage,
    createdAt: user.createdAt,
    profilePicture: user.profilePicture,
    bio: canViewContent ? user.bio : undefined,
    followersCount: canViewContent ? (user.followers?.length || 0) : undefined,
    followingCount: canViewContent ? (user.following?.length || 0) : undefined
  };

  if (relationship === "self") {
    return {
      ...user,
      isPrivate: Boolean(user.isPrivate),
      relationship,
      canViewContent: true,
      canMessage: false,
      followersCount: user.followers?.length || 0,
      followingCount: user.following?.length || 0,
      incomingFollowRequestsCount
    };
  }

  if (canViewContent) {
    return {
      ...user,
      isPrivate: Boolean(user.isPrivate),
      relationship,
      canViewContent: true,
      canMessage,
      followersCount: user.followers?.length || 0,
      followingCount: user.following?.length || 0
    };
  }

  return base;
};
