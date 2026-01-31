import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { ArrowLeft, Send, MoreVertical, Image, Mic, Heart, Paperclip, Smile, UserPlus, User2Icon } from "lucide-react";
import { format } from "date-fns";
import API_BASE_URL from "../config/api";

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
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(API_BASE_URL, {
      withCredentials: true,
    });

    if (currentUser?._id) {
      socketRef.current.emit("userOnline", currentUser._id);
    }

    socketRef.current.on("updateOnlineUsers", (users) => {
      setOnlineUsers(users);
      setIsOnline(users.includes(userId));
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [currentUser?._id]);

  useEffect(() => {
    if (!userId || !currentUser?._id) return;

    const fetchUser = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/user/get/${userId}`, { withCredentials: true });
        setUser(data);
        setLastSeen(data.lastSeen || null);
      } catch (error) {
        console.error("Failed to load user", error);
      }
    };

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${API_BASE_URL}/api/message/${userId}`, { withCredentials: true });
        setMessages(data);
        setLoading(false);
      } catch (error) {
        console.error("Failed to load messages", error);
        setLoading(false);
      }
    };

    socketRef.current?.emit("joinChat", { userId: currentUser._id });

    fetchUser();
    fetchMessages();

    return () => {
      socketRef.current?.emit("leaveChat", { userId: currentUser._id });
    };
  }, [userId, currentUser?._id]);

  useEffect(() => {
    if (!socketRef.current || !userId || !currentUser?._id) return;

    socketRef.current.on("receiveMessage", (message) => {
      setMessages((prev) => [...prev, message]);
      if (message.sender._id === userId) {
        socketRef.current.emit("markAsRead", { senderId: userId, receiverId: currentUser._id });
      }
    });

    socketRef.current.on("userTyping", ({ userId: typingUserId, isTyping: typing }) => {
      if (typingUserId === userId) setIsTyping(typing);
    });

    socketRef.current.on("messagesRead", (readByUserId) => {
      if (readByUserId === userId) {
        setMessages((prev) =>
          prev.map((msg) => (msg.sender._id === currentUser._id ? { ...msg, read: true } : msg))
        );
      }
    });

    socketRef.current.on("messageDeleted", (messageId) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    });

    return () => {
      socketRef.current.off("receiveMessage");
      socketRef.current.off("userTyping");
      socketRef.current.off("messagesRead");
      socketRef.current.off("messageDeleted");
    };
  }, [userId, currentUser?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleTyping = () => {
    if (!socketRef.current || !userId) return;

    socketRef.current.emit("typing", { receiverId: userId, isTyping: true });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("typing", { receiverId: userId, isTyping: false });
    }, 2000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !userId || !currentUser?._id) return;

    clearTimeout(typingTimeoutRef.current);
    socketRef.current?.emit("typing", { receiverId: userId, isTyping: false });

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
      const { data } = await axios.post(`${API_BASE_URL}/api/message/send`, { receiverId: userId, content: newMessage }, { withCredentials: true });

      setMessages((prev) => prev.map((msg) => (msg._id === tempMessage._id ? { ...data, isPending: false } : msg)));
    } catch (error) {
      console.error("Error sending message", error);
    }
  };

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return "";
    return `Active ${format(new Date(timestamp), "h:mm a")}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <div className="bg-black p-4 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center">
          <button onClick={() => navigate("/messages")} className="mr-4">
            <ArrowLeft size={24} className="text-white" />
          </button>
          {user && (
            <div className="flex items-center">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                  <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-white"><User2Icon/></span>
                  </div>
                </div>
                {isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></div>
                )}
              </div>
              <div className="ml-3">
                <h2 className="font-medium text-white">{user.name}</h2>
                <span className="text-xs text-gray-400">
                  {isOnline ? "Active now" : lastSeen ? formatLastSeen(lastSeen) : "Offline"}
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center">
          <button className="p-2">
            <Paperclip size={22} className="text-white" />
          </button>
          <button className="p-2">
            <MoreVertical size={22} className="text-white" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-black">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="w-8 h-8 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
          </div>
        ) : (
          messages.map((msg) => {
            const isSender = msg.sender._id === currentUser?._id;
            return (
              <div key={msg._id} className={`flex mb-4 ${isSender ? "justify-end" : "justify-start"}`}
                onClick={() => {navigate(`/user/${msg.sender._id}`)}}>
                {!isSender && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center mr-2">
                    <span className="text-xs font-bold">{msg.sender.name?.[0]?.toUpperCase()}</span>
                  </div>
                )}
                <div
                  className={`max-w-xs px-4 py-2 rounded-2xl ${
                    isSender
                      ? "bg-green-600 text-white rounded-br-none"
                      : "bg-gray-800 text-white rounded-bl-none"
                  }`}
                >
                  <p>{msg.content}</p>
                  <div className="text-xs text-gray-400 mt-1 flex items-center justify-end">
                    {format(new Date(msg.createdAt), "h:mm a")}
                    {isSender && (
                      <span className="ml-1">
                        {msg.read ? (
                          <div className="text-blue-400">•</div>
                        ) : msg.isPending ? (
                          <div className="text-gray-500">•</div>
                        ) : (
                          <div className="text-gray-400">•</div>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        {isTyping && (
          <div className="flex justify-start mb-4">
            <div className="max-w-xs px-4 py-2 rounded-2xl bg-gray-800 text-white">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input - Instagram style */}
      <form onSubmit={handleSendMessage} className="p-3 flex items-center border-t border-gray-800 bg-black">
        <button type="button" className="p-2 text-gray-400">
          <Smile size={24} />
        </button>
        <input
          ref={messageInputRef}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyUp={handleTyping}
          placeholder="Message..."
          className="flex-1 p-3 bg-transparent text-white placeholder-gray-500 focus:outline-none"
        />
        {!newMessage.trim() ? (
          <div className="flex">
            <button type="button" className="p-2 text-gray-400">
              <Mic size={24} />
            </button>
            <button type="button" className="p-2 text-gray-400">
              <Image size={24} />
            </button>
            <button type="button" className="p-2 text-gray-400">
              <Heart size={24} />
            </button>
          </div>
        ) : (
          <button type="submit" className="p-2 text-blue-500 font-semibold">
            Send
          </button>
        )}
      </form>
    </div>
  );
};

export default MessageChat;