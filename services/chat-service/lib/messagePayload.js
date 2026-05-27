/** Plain JSON-safe message for Socket.io clients */
export const serializeMessage = (doc) => {
  if (!doc) return doc;
  const m = typeof doc.toObject === "function" ? doc.toObject({ virtuals: true }) : { ...doc };

  const normalizeUser = (u) => {
    if (!u) return u;
    const raw = typeof u.toObject === "function" ? u.toObject() : u;
    return {
      _id: String(raw._id),
      name: raw.name,
      email: raw.email,
      avatar: raw.avatar ?? null
    };
  };

  return {
    _id: String(m._id),
    content: m.content,
    read: Boolean(m.read),
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    sender: normalizeUser(m.sender),
    receiver: normalizeUser(m.receiver)
  };
};

export const emitMessage = (io, message) => {
  if (!io || !message) return;
  const payload = serializeMessage(message);
  const senderId = String(payload.sender?._id || message.sender);
  const receiverId = String(payload.receiver?._id || message.receiver);

  io.to(receiverId).emit("receiveMessage", payload);
  io.to(senderId).emit("receiveMessage", payload);
};
