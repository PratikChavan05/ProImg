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
    origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:3000", "http://localhost:5173","http://localhost:5174","https://pro-img-48i9.vercel.app/"],
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
});

app.set("io", io);

app.use(cors({
  origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:3000", "http://localhost:5173","http://localhost:5174"],
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

  socket.on("userOnline", (userId) => {
    if (!userId) return;
    
    onlineUsers.set(userId, socket.id);
    socket.userId = userId; 
    
    socket.join(userId);
    userRooms.set(socket.id, userId);
    
    io.emit("updateOnlineUsers", Array.from(onlineUsers.keys()));
    console.log(`👤 User ${userId} is now online`);
  });

  socket.on("joinChat", ({ userId }) => {
    if (userId) {
      socket.join(userId);
      console.log(`🔄 User joined personal room: ${userId}`);
    }
  });

  socket.on("leaveChat", ({ userId }) => {
    if (userId) {
      socket.leave(userId);
      console.log(`🔄 User left personal room: ${userId}`);
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

  socket.on("disconnect", () => {
    const userId = userRooms.get(socket.id);
    
    if (userId) {
      onlineUsers.delete(userId);
      userRooms.delete(socket.id);
      
      io.emit("updateOnlineUsers", Array.from(onlineUsers.keys()));
      console.log(` User ${userId} disconnected`);
    }
  });
});