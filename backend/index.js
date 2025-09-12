import express from "express";
import dotenv from "dotenv";
import connectDb from "./database/db.js";
import cookieParser from "cookie-parser";
import cloudinary from "cloudinary";
import path from "path";
import passport from "./controllers/passport.js";
import session from "express-session";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

dotenv.config();

if (!process.env.Cloud_Name || !process.env.Cloud_Api || !process.env.Cloud_Secret || !process.env.PORT) {
  console.error(" Missing required environment variables. Check your .env file.");
  process.exit(1);
}

cloudinary.v2.config({
  cloud_name: process.env.Cloud_Name,
  api_key: process.env.Cloud_Api,
  api_secret: process.env.Cloud_Secret,
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
});

app.set("io", io);

app.use(cors({
  origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:3000", "http://localhost:5173"],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "qwertyuiop",
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000 
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

import userRoutes from "./routes/userRoutes.js";
import pinRoutes from "./routes/pinRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";  
import healthRoutes from "./models/health.js";
import { User } from "./models/userModel.js";

app.use("/api/user", userRoutes);
app.use("/api/pin", pinRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/check", healthRoutes);

const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, "/frontend/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
});

connectDb().then(() => {
  server.listen(process.env.PORT, () => {
    console.log(`Server is running on http://localhost:${process.env.PORT}`);
  });
});

const onlineUsers = new Map();
const userRooms = new Map();

io.on("connection", (socket) => {
  console.log("New user connected:", socket.id);

  socket.on("userOnline", async (userId) => {
    if (!userId) return;
    
    try {
      // Update database to show user is online (remove lastSeen or set to null)
      await User.findByIdAndUpdate(userId, { 
        lastSeen: null // Set to null when online
      });

      onlineUsers.set(userId, socket.id);
      socket.userId = userId; 
      
      socket.join(userId);
      userRooms.set(socket.id, userId);
      
      // Emit to all users that this user is now online
      io.emit("updateOnlineUsers", Array.from(onlineUsers.keys()));
      
      // Specifically emit that this user came online
      socket.broadcast.emit("userOnline", { userId });
      
      console.log(`👤 User ${userId} is now online`);
    } catch (error) {
      console.error(`Error updating user online status:`, error);
    }
  });

  socket.on("joinChat", ({ userId }) => {
    if (userId) {
      socket.join(userId);
      console.log(`🔄 User joined personal room: ${userId}`);
    }
  });

  socket.on("leaveChat", async ({ userId }) => {
    if (userId) {
      socket.leave(userId);
      try {
        const updatedUser = await User.findByIdAndUpdate(
          userId, 
          { lastSeen: new Date() }, 
          { new: true }
        );
        
        // Remove from online users
        onlineUsers.delete(userId);
        
        // Emit to all users about offline status
        io.emit("userOffline", {
          userId: userId,
          lastSeen: updatedUser.lastSeen,
        });
        
        io.emit("updateOnlineUsers", Array.from(onlineUsers.keys()));
        
        console.log(`🔄 User left chat: ${userId}`);
      } catch (error) {
        console.error(`Error updating lastSeen for user ${userId}:`, error);
      }
    }
  });

  socket.on("typing", ({ receiverId, isTyping }) => {
    if (receiverId && socket.userId) {
      io.to(receiverId).emit("userTyping", { 
        userId: socket.userId, 
        isTyping 
      });
    }
  });

  socket.on("markAsRead", ({ senderId, receiverId }) => {
    if (senderId) {
      io.to(senderId).emit("messagesRead", receiverId);
      console.log(`Messages marked as read for ${senderId}`);
    }
  });

  socket.on("messageRead", ({ messageId, senderId }) => {
    if (senderId) {
      io.to(senderId).emit("messageReadUpdate", messageId);
    }
  });

  // Get current online status
  socket.on("getUserStatus", async ({ userId }, callback) => {
    try {
      const user = await User.findById(userId).select('lastSeen');
      const isOnline = onlineUsers.has(userId);
      
      callback({
        success: true,
        isOnline,
        lastSeen: user.lastSeen
      });
    } catch (error) {
      console.error("Error fetching user status:", error);
      callback({
        success: false,
        error: "Failed to fetch user status"
      });
    }
  });

  socket.on("disconnect", async () => {
    const userId = userRooms.get(socket.id);
    
    if (userId) {
      onlineUsers.delete(userId);
      userRooms.delete(socket.id);
      
      try {
        const updatedUser = await User.findByIdAndUpdate(
          userId, 
          { lastSeen: new Date() }, 
          { new: true }
        );
        
        // Emit to all users about offline status
        io.emit("userOffline", {
          userId: userId,
          lastSeen: updatedUser.lastSeen
        });
        
        io.emit("updateOnlineUsers", Array.from(onlineUsers.keys()));
        console.log(`👤 User ${userId} disconnected`);
      } catch (error) {
        console.error(`Error updating lastSeen for user ${userId}:`, error);
      }
    }
  });
  socket.emit("updateOnlineUsers", Array.from(onlineUsers.keys()));
});