import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { io } from "socket.io-client";
import { ArrowLeft, Send, Loader, Check, CheckCheck, Lock } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { SOCKET_URL } from "../config/api";
import customAxios from "../config/axios";
import { toast } from "react-toastify";
import { decryptMessage } from "../utils/e2ee";

const normalizeId = (id) => (id?._id ?? id)?.toString?.() ?? String(id);

const normalizeMessage = (message) => {
  if (!message) return message;
  return {
    ...message,
    _id: normalizeId(message._id),
    sender: message.sender
      ? { ...message.sender, _id: normalizeId(message.sender._id ?? message.sender) }
      : message.sender,
    receiver: message.receiver
      ? { ...message.receiver, _id: normalizeId(message.receiver._id ?? message.receiver) }
      : message.receiver
  };
};

const formatMsgTime = (dateString) => {
  const d = new Date(dateString);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return `Yesterday ${format(d, "h:mm a")}`;
  return format(d, "MMM d, h:mm a");
};

const MessageChat = ({ currentUser }) => {
  const { userId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [chatBlocked, setChatBlocked] = useState(null);
  const [keys, setKeys] = useState(null);
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!currentUser?._id) return;
    const loadExistingKeys = () => {
      try {
        const pubKeyName = `proimg-e2ee-pub-${currentUser._id}`;
        const privKeyName = `proimg-e2ee-priv-${currentUser._id}`;
        const storedPub = localStorage.getItem(pubKeyName);
        const storedPriv = localStorage.getItem(privKeyName);
        if (storedPub && storedPriv) {
          setKeys({
            publicKey: JSON.parse(storedPub),
            privateKey: JSON.parse(storedPriv)
          });
        }
      } catch (err) {
        console.error("Failed to load existing local keys", err);
      }
    };
    loadExistingKeys();
  }, [currentUser?._id]);

  useEffect(() => {
    if (!currentUser?._id) return;

    const myId = normalizeId(currentUser._id);
    const peerId = userId ? normalizeId(userId) : null;

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10
    });
    socketRef.current = socket;

    const joinRooms = () => {
      socket.emit("userOnline", myId);
      socket.emit("joinChat", { userId: myId });
    };

    const onReceiveMessage = async (raw) => {
      const message = normalizeMessage(raw);
      const senderId = normalizeId(message.sender?._id);
      const receiverId = normalizeId(message.receiver?._id);
      const inThread =
        peerId &&
        ((senderId === myId && receiverId === peerId) || (senderId === peerId && receiverId === myId));

      if (!inThread) return;

      const isMine = senderId === myId;
      let decryptedContent = message.content;
      try {
        const privKeyName = `proimg-e2ee-priv-${myId}`;
        const storedPriv = localStorage.getItem(privKeyName);
        if (storedPriv && message.content && message.content.startsWith("{")) {
          const privateKey = JSON.parse(storedPriv);
          decryptedContent = await decryptMessage(message.content, privateKey, isMine);
        }
      } catch (err) {
        console.error("Failed to decrypt legacy received message", err);
      }
      const decryptedMessage = { ...message, content: decryptedContent };

      setMessages((prev) => {
        const msgId = normalizeId(decryptedMessage._id);
        const withoutPending = prev.filter(
          (m) => !(m.isPending && m.content === decryptedMessage.content && senderId === myId)
        );
        if (withoutPending.some((m) => normalizeId(m._id) === msgId)) return withoutPending;
        return [...withoutPending, decryptedMessage];
      });

      if (senderId === peerId && socket.connected) {
        socket.emit("markAsRead", { senderId: peerId, receiverId: myId });
      }
    };

    const onOnlineUsers = (users) => {
      const list = (users || []).map(normalizeId);
      if (peerId) setIsOnline(list.includes(peerId));
    };

    const onTyping = ({ userId: typingUserId, isTyping: typing }) => {
      if (peerId && normalizeId(typingUserId) === peerId) setIsTyping(typing);
    };

    const onMessagesRead = (readByUserId) => {
      if (peerId && normalizeId(readByUserId) === peerId) {
        setMessages((prev) =>
          prev.map((msg) => (normalizeId(msg.sender?._id) === myId ? { ...msg, read: true } : msg))
        );
      }
    };

    const onMessageDeleted = (messageId) => {
      setMessages((prev) => prev.filter((msg) => normalizeId(msg._id) !== normalizeId(messageId)));
    };

    socket.on("connect", joinRooms);
    socket.on("updateOnlineUsers", onOnlineUsers);
    socket.on("receiveMessage", onReceiveMessage);
    socket.on("userTyping", onTyping);
    socket.on("messagesRead", onMessagesRead);
    socket.on("messageDeleted", onMessageDeleted);
    socket.on("connect_error", (err) => console.error("Socket connect error:", err.message));

    if (socket.connected) joinRooms();

    return () => {
      socket.emit("leaveChat", { userId: myId });
      socket.off("connect", joinRooms);
      socket.off("updateOnlineUsers", onOnlineUsers);
      socket.off("receiveMessage", onReceiveMessage);
      socket.off("userTyping", onTyping);
      socket.off("messagesRead", onMessagesRead);
      socket.off("messageDeleted", onMessageDeleted);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUser?._id, userId]);

  useEffect(() => {
    if (!userId || !currentUser?._id) return;

    const load = async () => {
      try {
        setLoading(true);
        setChatBlocked(null);
        const userRes = await customAxios.get(`/api/user/${userId}`);
        setUser(userRes.data);

        if (!userRes.data?.canMessage) {
          setChatBlocked(
            "You can only message people who follow you back. Follow each other first."
          );
          setMessages([]);
          return;
        }

        const msgRes = await customAxios.get(`/api/message/${userId}`);
        const rawList = (Array.isArray(msgRes.data) ? msgRes.data : []).map(normalizeMessage);
        
        const myId = normalizeId(currentUser._id);
        const privKeyName = `proimg-e2ee-priv-${myId}`;
        const storedPriv = localStorage.getItem(privKeyName);
        const privateKey = storedPriv ? JSON.parse(storedPriv) : null;
        
        const decryptedList = [];
        for (const msg of rawList) {
          const isMine = normalizeId(msg.sender?._id ?? msg.sender) === myId;
          let decryptedContent = msg.content;
          if (privateKey && msg.content && msg.content.startsWith("{")) {
            try {
              decryptedContent = await decryptMessage(msg.content, privateKey, isMine);
            } catch (err) {
              console.error("Failed to decrypt legacy chat history message", err);
            }
          }
          decryptedList.push({ ...msg, content: decryptedContent });
        }
        
        setMessages(decryptedList);
      } catch (error) {
        const msg = error.response?.data?.message;
        if (error.response?.status === 403) {
          setChatBlocked(msg || "Messaging is not allowed with this user.");
          setMessages([]);
        } else {
          console.error("Failed to load chat", error);
          toast.error(msg || "Failed to load chat");
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId, currentUser?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

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

    const text = newMessage.trim();
    clearTimeout(typingTimeoutRef.current);
    socketRef.current?.emit("typing", { receiverId: userId, isTyping: false });

    const tempMessage = {
      _id: `temp-${Date.now()}`,
      content: text,
      sender: { _id: currentUser._id, name: currentUser.name },
      receiver: { _id: userId },
      createdAt: new Date().toISOString(),
      read: false,
      isPending: true
    };

    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage("");
    messageInputRef.current?.focus();

    try {
      const { data: saved } = await customAxios.post("/api/message/send", {
        receiverId: userId,
        content: text
      });
      
      const decryptedSaved = normalizeMessage(saved);

      setMessages((prev) => {
        const withoutDup = prev.filter(
          (msg) =>
            normalizeId(msg._id) !== normalizeId(decryptedSaved._id) &&
            !(msg.isPending && msg.content === decryptedSaved.content)
        );
        return [...withoutDup, { ...decryptedSaved, isPending: false }];
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not send message");
      setMessages((prev) => prev.filter((msg) => msg._id !== tempMessage._id));
    }
  };

  const myId = normalizeId(currentUser?._id);

  return (
    <div className="page-shell">
      <div className="page-container max-w-2xl">
        <div className="card flex flex-col overflow-hidden min-h-[calc(100vh-10rem)] max-h-[calc(100vh-6rem)]">
          {/* Header */}
          <header className="flex items-center gap-3 px-4 py-3 border-b border-stone-200 bg-white shrink-0">
            <button
              type="button"
              onClick={() => navigate("/messages")}
              className="btn-ghost !p-2 shrink-0"
              aria-label="Back to messages"
            >
              <ArrowLeft size={22} />
            </button>

            {user ? (
              <Link
                to={`/user/${user._id}`}
                className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80 transition"
              >
                <div className="relative shrink-0">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-soft ${
                    user.isPremium
                      ? "bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-600 ring-2 ring-amber-400"
                      : "bg-gradient-to-br from-ocean-400 to-fresh-500"
                  }`}>
                    {user.name?.slice(0, 1).toUpperCase() || "?"}
                  </div>
                  {isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-fresh-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h1 className="font-semibold text-ink truncate">{user.name}</h1>
                    {user.isPremium && (
                      <svg className="w-3.5 h-3.5 text-amber-500 fill-amber-500/10 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    )}
                    <span className="inline-flex items-center text-xs text-fresh-600 bg-fresh-50 px-1.5 py-0.5 rounded-full font-medium gap-0.5 border border-fresh-100 shadow-soft" title="Messages are encrypted at rest on the server">
                      <Lock size={10} className="fill-fresh-600/10" />
                      Encrypted
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted">
                    {isTyping ? (
                      <span className="text-ocean-600 font-medium">Typing…</span>
                    ) : isOnline ? (
                      "Active now"
                    ) : (
                      "Offline"
                    )}
                  </p>
                </div>
              </Link>
            ) : (
              <div className="h-11 w-32 bg-paper-dark rounded-lg animate-pulse" />
            )}
          </header>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-5 bg-paper-dark/50 space-y-3">
            {loading ? (
              <div className="flex justify-center items-center h-full min-h-[200px]">
                <Loader className="w-8 h-8 text-ocean-600 animate-spin" />
              </div>
            ) : chatBlocked ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center px-6">
                <p className="font-medium text-ink">Messaging unavailable</p>
                <p className="text-sm text-ink-muted mt-2">{chatBlocked}</p>
                <Link to={`/user/${userId}`} className="btn-secondary mt-4 text-sm">
                  View profile
                </Link>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center px-6">
                <p className="font-medium text-ink">No messages yet</p>
                <p className="text-sm text-ink-muted mt-1">Say hello to start the conversation.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = normalizeId(msg.sender?._id) === myId;
                return (
                  <div
                    key={msg._id}
                    className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    {!isMine && (
                      <Link
                        to={`/user/${msg.sender?._id}`}
                        className="w-8 h-8 rounded-lg bg-gradient-to-br from-ocean-300 to-fresh-400 flex items-center justify-center text-white text-xs font-bold shrink-0 mb-0.5"
                      >
                        {msg.sender?.name?.slice(0, 1).toUpperCase() || "?"}
                      </Link>
                    )}
                    <div
                      className={`max-w-[75%] px-4 py-2.5 shadow-soft ${
                        isMine
                          ? "bg-gradient-to-br from-ocean-500 to-fresh-600 text-white rounded-2xl rounded-br-md"
                          : "bg-white border border-stone-200 text-ink rounded-2xl rounded-bl-md"
                      } ${msg.isPending ? "opacity-70" : ""}`}
                    >
                      <p className="text-[15px] leading-relaxed break-words">{msg.content}</p>
                      <div
                        className={`flex items-center justify-end gap-1 mt-1 text-[11px] ${
                          isMine ? "text-white/80" : "text-ink-faint"
                        }`}
                      >
                        <span>{formatMsgTime(msg.createdAt)}</span>
                        {isMine && (
                          <span className="ml-0.5">
                            {msg.isPending ? (
                              <Check size={14} className="opacity-60" />
                            ) : msg.read ? (
                              <CheckCheck size={14} />
                            ) : (
                              <Check size={14} />
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
              <div className="flex items-end gap-2">
                <div className="w-8 h-8 rounded-lg bg-stone-200 shrink-0" />
                <div className="bg-white border border-stone-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-soft">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-ocean-400 animate-bounce" />
                    <span
                      className="w-2 h-2 rounded-full bg-ocean-400 animate-bounce"
                      style={{ animationDelay: "0.15s" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-ocean-400 animate-bounce"
                      style={{ animationDelay: "0.3s" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          {!chatBlocked && (
            <form
              onSubmit={handleSendMessage}
              className="shrink-0 px-4 py-3 border-t border-stone-200 bg-white flex items-center gap-2"
            >
              <input
                ref={messageInputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyUp={handleTyping}
                placeholder="Write a message…"
                className="input-field !py-2.5 flex-1"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="btn-primary !p-3 !rounded-xl shrink-0 disabled:opacity-40"
                aria-label="Send"
              >
                <Send size={20} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageChat;
