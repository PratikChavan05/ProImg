import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { ArrowLeft, Send, MoreVertical, Image, Mic, Heart, Paperclip, Smile, User2Icon } from "lucide-react";
import { format } from "date-fns";
import { Check, CheckCheck, Clock } from "lucide-react";
import CryptoJs from "crypto-js";

const secret_key = import.meta.env.VITE_ENCRYPTION_SECRET;

function encryptMessage(message){
  return CryptoJs.AES.encrypt(message,secret_key).toString();
}

function decryptMessage(encryptedText){
  const bytes = CryptoJs.AES.decrypt(encryptedText,secret_key);
  return bytes.toString(CryptoJs.enc.Utf8);
}
const MessageChat = ({ currentUser }) => {
  const { userId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const fetchUserStatus = async (userId) => {
    try {
      const { data } = await axios.get(`/api/user/status/${userId}`);
      return data;
    } catch (error) {
      console.error("Failed to fetch user status:", error);
      return null;
    }
  };

  const fetchMultipleUsersStatus = async (userIds) => {
    try {
      const { data } = await axios.post("/api/user/status/multiple", { userIds });
      return data.users;
    } catch (error) {
      console.error("Failed to fetch multiple users status:", error);
      return {};
    }
  };

  const updateMyLastSeen = async () => {
    try {
      await axios.put("/api/user/status/update");
    } catch (error) {
      console.error("Failed to update last seen:", error);
    }
  };


  useEffect(() => {
    const initializeSocket = () => {
      socketRef.current = io(
        process.env.NODE_ENV === "production" ? window.location.origin : "http://localhost:5002",
        {
          withCredentials: true,
          transports: ["websocket", "polling"],
        }
      );

      socketRef.current.on("connect", () => {
        console.log("Socket connected");
        setSocketConnected(true);

        if (currentUser?._id) {
          socketRef.current.emit("userOnline", currentUser._id);
        }
      });

      socketRef.current.on("disconnect", () => {
        console.log("Socket disconnected");
        setSocketConnected(false);
      });

      socketRef.current.on("updateOnlineUsers", (users) => {
        setOnlineUsers(users);
        const chatUserOnline = users.includes(userId);
        setIsOnline(chatUserOnline);

      });

      socketRef.current.on("userOnline", ({ userId: onlineUserId }) => {
        if (onlineUserId === userId) {
          setIsOnline(true);
          setLastSeen(null);
        }
      });

      socketRef.current.on("userOffline", ({ userId: offlineUserId, lastSeen: userLastSeen }) => {
        if (offlineUserId === userId) {
          setIsOnline(false);
          setLastSeen(userLastSeen);
        }
      });

      const handleVisibilityChange = () => {
        if (document.visibilityState === "hidden" && currentUser?._id && socketRef.current) {
          socketRef.current.emit("leaveChat", { userId: currentUser._id });
          updateMyLastSeen();
        } else if (document.visibilityState === "visible" && currentUser?._id && socketRef.current) {
          socketRef.current.emit("userOnline", currentUser._id);
        }
      };

      const handleBeforeUnload = () => {
        if (currentUser?._id && socketRef.current) {
          socketRef.current.emit("leaveChat", { userId: currentUser._id });
          updateMyLastSeen();
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("beforeunload", handleBeforeUnload);

      return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("beforeunload", handleBeforeUnload);

        if (currentUser?._id && socketRef.current) {
          socketRef.current.emit("leaveChat", { userId: currentUser._id });
          updateMyLastSeen();
        }

        socketRef.current?.disconnect();
      };
    };

    return initializeSocket();
  }, [currentUser?._id, userId]);

  useEffect(() => {
    const fetchInitialStatus = async () => {
      if (!userId) return;

      const statusData = await fetchUserStatus(userId);
      if (statusData) {
        setUser({ name: statusData.name, email: statusData.email });

        if (!socketConnected) {
          setLastSeen(statusData.lastSeen);
        }
      }
    };

    fetchInitialStatus();
  }, [userId]);

  useEffect(() => {
    if (socketRef.current && socketConnected && userId) {
      socketRef.current.emit("getUserStatus", { userId }, (response) => {
        if (response.success) {
          setIsOnline(response.isOnline);
          if (!response.isOnline && response.lastSeen) {
            setLastSeen(response.lastSeen);
          }
        }
      });
    }
  }, [userId, socketConnected]);


  useEffect(() => {
    if (!userId || !currentUser?._id) return;

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`/api/message/${userId}`);
        setMessages(data.map(msg=>({...msg,content:decryptMessage(msg.content)})));
        setLoading(false);
      } catch (error) {
        console.error("Failed to load messages", error);
        setLoading(false);
      }
    };

    if (socketRef.current && socketConnected) {
      socketRef.current.emit("joinChat", { userId: currentUser._id });
    }

    fetchMessages();

    return () => {
      if (socketRef.current && currentUser?._id) {
        socketRef.current.emit("leaveChat", { userId: currentUser._id });
        updateMyLastSeen();
      }
    };
  }, [userId, currentUser?._id, socketConnected]);

  useEffect(() => {
    if (!socketRef.current || !userId || !currentUser?._id || !socketConnected) return;

    const handleReceiveMessage = (message) => {
      setMessages((prev)=[...prev,{...message,content:decryptMessage(message.content)}]);
      if (message.sender._id === userId) {
        socketRef.current.emit("markAsRead", { senderId: userId, receiverId: currentUser._id });
      }
    };

    const handleUserTyping = ({ userId: typingUserId, isTyping: typing }) => {
      if (typingUserId === userId) setIsTyping(typing);
    };

    const handleMessagesRead = (readByUserId) => {
      if (readByUserId === userId) {
        setMessages((prev) =>
          prev.map((msg) => (msg.sender._id === currentUser._id ? { ...msg, read: true } : msg))
        );
      }
    };

    const handleMessageDeleted = (messageId) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    };

    socketRef.current.on("receiveMessage", handleReceiveMessage);
    socketRef.current.on("userTyping", handleUserTyping);
    socketRef.current.on("messagesRead", handleMessagesRead);
    socketRef.current.on("messageDeleted", handleMessageDeleted);

    return () => {
      if (socketRef.current) {
        socketRef.current.off("receiveMessage", handleReceiveMessage);
        socketRef.current.off("userTyping", handleUserTyping);
        socketRef.current.off("messagesRead", handleMessagesRead);
        socketRef.current.off("messageDeleted", handleMessageDeleted);
      }
    };
  }, [userId, currentUser?._id, socketConnected]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleTyping = useCallback(() => {
    if (!socketRef.current || !userId || !socketConnected) return;

    socketRef.current.emit("typing", { receiverId: userId, isTyping: true });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("typing", { receiverId: userId, isTyping: false });
    }, 2000);
  }, [userId, socketConnected]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !userId || !currentUser?._id) return;

    clearTimeout(typingTimeoutRef.current);
    if (socketRef.current && socketConnected) {
      socketRef.current.emit("typing", { receiverId: userId, isTyping: false });
    }

    const tempMessage = {
      _id: Date.now().toString(),
      content: newMessage,
      sender: { _id: currentUser._id, name: currentUser.name },
      receiver: { _id: userId },
      createdAt: new Date().toISOString(),
      read: false,
      isPending: true,
    };

    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage("");

    messageInputRef.current?.focus();

    try {
      const { data } = await axios.post("/api/message/send", { receiverId: userId, content: encryptMessage(newMessage) });
      setMessages((prev) =>
        prev.map((msg) => (msg._id === tempMessage._id ? { ...data,content:decryptMessage(data.content), isPending: false } : msg))
      );
    } catch (error) {
      console.error("Error sending message", error);
      setMessages((prev) => prev.filter((msg) => msg._id !== tempMessage._id));
    }
  };

  const formatLastSeen = useCallback((timestamp) => {
    if (!timestamp) return "Offline";

    const now = new Date();
    const lastSeenDate = new Date(timestamp);
    const diffInMinutes = Math.floor((now - lastSeenDate) / (1000 * 60));

    if (diffInMinutes < 1) return "Active just now";
    if (diffInMinutes < 60) return `Active ${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;
    if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `Active ${hours} hour${hours > 1 ? "s" : ""} ago`;
    }
    if (diffInMinutes < 10080) {
      const days = Math.floor(diffInMinutes / 1440);
      return `Active ${days} day${days > 1 ? "s" : ""} ago`;
    }
    return `Active ${format(lastSeenDate, "MMM d, yyyy")}`;
  }, []);

  const getActivityStatus = useCallback(() => {
    if (!socketConnected) return "Connecting...";
    if (isOnline) return "Active now";
    if (lastSeen) return formatLastSeen(lastSeen);
    return "Offline";
  }, [socketConnected, isOnline, lastSeen, formatLastSeen]);

  const getActivityColor = useCallback(() => {
    if (!socketConnected) return "text-yellow-400";
    if (isOnline) return "text-green-400";
    return "text-gray-400";
  }, [socketConnected, isOnline]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white">
      {/* Header */}
      <div className="bg-slate-900 p-4 flex items-center justify-between border-b border-gray-800 shadow-lg">
        <div className="flex items-center">
          <button onClick={() => navigate("/messages")} className="mr-4 p-2 rounded-full hover:bg-slate-700 transition-colors duration-200">
            <ArrowLeft size={24} className="text-white" />
          </button>
          {user && (
            <div className="flex items-center">
              <div className="relative">
                <button
                  onClick={() => navigate(`/user/${userId}`)}
                  className="w-10 h-10 bg-gradient-to-tr from-cyan-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg"
                >
                  <User2Icon size={16} className="text-white" />
                </button>

                {isOnline && socketConnected && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-950 animate-pulse"></div>
                )}
              </div>
              <div className="ml-4">
                <h2 className="font-semibold text-lg text-white">{user.name}</h2>
                <span className={`text-xs ${getActivityColor()} font-medium`}>
                  {getActivityStatus()}
                </span>
              </div>
            </div>
          )}

        </div>
        <div className="flex items-center">
          <button className="p-2 rounded-full hover:bg-slate-700 transition-colors duration-200">
            <Paperclip size={22} className="text-gray-400 hover:text-white" />
          </button>
          <button className="p-2 rounded-full hover:bg-slate-700 transition-colors duration-200">
            <MoreVertical size={22} className="text-gray-400 hover:text-white" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="w-10 h-10 border-4 border-gray-600 border-t-white rounded-full animate-spin"></div>
          </div>
        ) : (
          messages.map((msg) => {
            const isSender = msg.sender._id === currentUser?._id;
            return (
              <div key={msg._id} className={`flex mb-4 ${isSender ? "justify-end" : "justify-start"}`}>
                {!isSender && (
                  <div
                    className="flex-shrink-0 w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center mr-3 cursor-pointer hover:bg-gray-700 transition-colors duration-200 shadow-md"
                    onClick={() => navigate(`/user/${msg.sender._id}`)}
                  >
                    <span className="text-sm font-bold text-gray-200">{msg.sender.name?.[0]?.toUpperCase()}</span>
                  </div>
                )}
                <div
                  className={`max-w-xs px-5 py-3 rounded-3xl shadow-lg transform transition-all duration-300 ease-in-out ${isSender
                    ? "bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-br-none"
                    : "bg-gray-800 text-white rounded-bl-none"
                    }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <div className="text-xs text-gray-300 mt-1 text-right">
                    <span>
                      {format(new Date(msg.createdAt), "h:mm a")}
                    </span>
                    {isSender && (
                      <>
                        {msg.read ? (
                          <CheckCheck size={14} className="ml-1 text-blue-400 inline-block" />
                        ) : msg.isPending ? (
                          <Clock size={14} className="ml-1 text-gray-400 inline-block" />
                        ) : (
                          <Check size={14} className="ml-1 text-gray-400 inline-block" />
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start mb-4 animate-fade-in">
            <div className="max-w-xs px-5 py-3 rounded-3xl bg-gray-800 text-white">
              <div className="flex space-x-1">
                <div className="w-2.5 h-2.5 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2.5 h-2.5 bg-gray-500 rounded-full animate-bounce delay-200"></div>
                <div className="w-2.5 h-2.5 bg-gray-500 rounded-full animate-bounce delay-400"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 flex items-center border-t border-gray-800 bg-slate-900 shadow-lg">
        <button type="button" className="p-2 text-gray-400 rounded-full hover:bg-slate-700 transition-colors duration-200">
          <Smile size={24} />
        </button>
        <input
          ref={messageInputRef}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyUp={handleTyping}
          placeholder="Message..."
          className="flex-1 px-4 py-3 mx-3 bg-gray-800 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
        />
        {!newMessage.trim() ? (
          <div className="flex space-x-2">
            <button type="button" className="p-2 text-gray-400 rounded-full hover:bg-slate-700 transition-colors duration-200">
              <Mic size={24} />
            </button>
            <button type="button" className="p-2 text-gray-400 rounded-full hover:bg-slate-700 transition-colors duration-200">
              <Image size={24} />
            </button>
            <button type="button" className="p-2 text-gray-400 rounded-full hover:bg-slate-700 transition-colors duration-200">
              <Heart size={24} />
            </button>
          </div>
        ) : (
          <button type="submit" className="p-3 bg-blue-500 rounded-full text-white font-semibold hover:bg-blue-600 transition-colors duration-200 shadow-lg">
            <Send size={20} />
          </button>
        )}
      </form>
    </div>
  );
};

export default MessageChat;