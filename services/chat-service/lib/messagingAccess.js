const idStr = (id) => (id?._id || id)?.toString?.() ?? String(id);

/** Mutual follow — both users must follow each other. */
export const areMutualFriends = (userA, userB) => {
  if (!userA || !userB) return false;
  const a = idStr(userA._id);
  const b = idStr(userB._id);
  if (!a || !b || a === b) return false;

  // Instagram-style: userA (sender) follows userB (receiver)
  const aFollowsB =
    (userA.following || []).some((id) => idStr(id) === b) ||
    (userB.followers || []).some((id) => idStr(id) === a);

  return aFollowsB;
};

export const assertCanMessage = (senderReplica, receiverReplica) => {
  if (!senderReplica || !receiverReplica) {
    return { ok: false, message: "User not found" };
  }
  if (!areMutualFriends(senderReplica, receiverReplica)) {
    return {
      ok: false,
      message: "You can only message users you are following."
    };
  }
  return { ok: true };
};
