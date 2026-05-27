export const configureSockets = (io, logger) => {
  const onlineUsers = new Map();
  const userRooms = new Map();

  io.on("connection", (socket) => {
    logger.info(`New client connected via Socket.io: ${socket.id}`);

    // Mark user as online and join their personal room channel
    socket.on("userOnline", (userId) => {
      if (!userId) return;

      const uid = String(userId);
      onlineUsers.set(uid, socket.id);
      socket.userId = uid;

      socket.join(uid);
      userRooms.set(socket.id, uid);
      
      io.emit("updateOnlineUsers", Array.from(onlineUsers.keys()));
      logger.info(`👤 User ${userId} is now online`);
    });

    socket.on("joinChat", ({ userId }) => {
      if (userId) {
        const uid = String(userId);
        socket.join(uid);
        logger.info(`🔄 Socket ${socket.id} joined personal room: ${uid}`);
      }
    });

    socket.on("leaveChat", ({ userId }) => {
      if (userId) {
        socket.leave(String(userId));
        logger.info(`🔄 Socket ${socket.id} left personal room: ${userId}`);
      }
    });

    socket.on("typing", ({ receiverId, isTyping }) => {
      if (receiverId && socket.userId) {
        io.to(String(receiverId)).emit("userTyping", {
          userId: socket.userId,
          isTyping
        });
      }
    });

    socket.on("markAsRead", ({ senderId, receiverId }) => {
      if (senderId) {
        io.to(String(senderId)).emit("messagesRead", String(receiverId));
        logger.info(`Messages marked as read for ${senderId}`);
      }
    });

    socket.on("messageRead", ({ messageId, senderId }) => {
      if (senderId) {
        io.to(String(senderId)).emit("messageReadUpdate", messageId);
      }
    });

    socket.on("disconnect", () => {
      const userId = userRooms.get(socket.id);
      
      if (userId) {
        onlineUsers.delete(userId);
        userRooms.delete(socket.id);
        
        io.emit("updateOnlineUsers", Array.from(onlineUsers.keys()));
        logger.info(`👤 User ${userId} disconnected`);
      }
    });
  });
};
