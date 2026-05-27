import React, { useState, useEffect, useCallback } from "react";
import customAxios from "../config/axios";
import { Link, useNavigate } from "react-router-dom";
import { 
  MessageSquare, 
  Loader, 
  AlertCircle, 
  ArrowLeft, 
  Search, 
  Plus,
  Users,
  Bell,
  Filter,
  X,
  User,
  UserCog,
  CheckCircle2,
  CheckCircle,
  Globe
} from "lucide-react";
import { format, isToday, isYesterday, isThisWeek, isThisYear } from "date-fns";
import AllUsersPopup from "../components/AllUsersPopup";
import { useAuthStore } from "../store/authStore";
import { decryptMessage } from "../utils/e2ee";

const Conversations = ({loggedUser}) => {
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); 
  const [refreshing, setRefreshing] = useState(false);
  const [showAllUsersPopup, setShowAllUsersPopup] = useState(false);
  const [followLoading, setFollowLoading] = useState({});
  
  const navigate = useNavigate();

  const fetchConversations = useCallback(async (showRefreshIndicator = true) => {
    if (showRefreshIndicator) {
      setRefreshing(true);
    }
    
    try {
      const { data } = await customAxios.get("/api/message/conversations");
      const list = Array.isArray(data) ? data : [];
      
      let decryptedList = list;
      if (loggedUser?._id) {
        const myId = loggedUser._id.toString();
        try {
          const privKeyName = `proimg-e2ee-priv-${myId}`;
          const storedPriv = localStorage.getItem(privKeyName);
          if (storedPriv) {
            const privateKey = JSON.parse(storedPriv);
            decryptedList = await Promise.all(
              list.map(async (convo) => {
                if (convo?.lastMessage?.content && convo.lastMessage.content.startsWith("{")) {
                  const senderId = (convo.lastMessage.sender?._id ?? convo.lastMessage.sender)?.toString();
                  const isMine = senderId === myId;
                  try {
                    const decryptedContent = await decryptMessage(
                      convo.lastMessage.content,
                      privateKey,
                      isMine
                    );
                    return {
                      ...convo,
                      lastMessage: {
                        ...convo.lastMessage,
                        content: decryptedContent
                      }
                    };
                  } catch (e) {
                    console.error("Failed to decrypt legacy conversation preview", e);
                  }
                }
                return convo;
              })
            );
          }
        } catch (decryptErr) {
          console.error("[E2EE] Failed to decrypt lastMessage in conversation list", decryptErr);
        }
      }

      setConversations(decryptedList);
      applyFilters(decryptedList, searchTerm, activeFilter);
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error("Error fetching conversations:", err);
      setError(err?.response?.data?.message || "Failed to load conversations");
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchTerm, activeFilter, loggedUser?._id]);

  useEffect(() => {
    fetchConversations(false);
    
    const intervalId = setInterval(() => {
      fetchConversations(false);
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [fetchConversations]);

  const applyFilters = (conversations, search, filter) => {
    if (!Array.isArray(conversations)) {
      setFilteredConversations([]);
      return;
    }
    let result = [...conversations];
    
    if (search) {
      result = result.filter(convo => 
        convo.user.name.toLowerCase().includes(search.toLowerCase()) ||
        convo.lastMessage.content.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    switch (filter) {
      case "unread":
        result = result.filter(convo => convo.unreadCount > 0);
        break;
      case "recent":
        result = result.filter(convo => 
          new Date(convo.lastMessage.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        );
        break;
      default:
        break;
    }
    
    result.sort((a, b) => 
      new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
    );
    
    setFilteredConversations(result);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    applyFilters(conversations, value, activeFilter);
  };

  const clearSearch = () => {
    setSearchTerm("");
    applyFilters(conversations, "", activeFilter);
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    applyFilters(conversations, searchTerm, filter);
  };

  const handleRefresh = () => {
    fetchConversations(true);
  };

  // Handler for following/unfollowing users from popup
  const handleFollowToggle = async (userId, event) => {
    event.stopPropagation();
    
    if (!loggedUser) {
      navigate('/login');
      return;
    }
    
    if (loggedUser._id === userId) {
      return;
    }

    setFollowLoading(prev => ({ ...prev, [userId]: true }));
    
    try {
      await useAuthStore.getState().toggleFollow(userId);
    } catch (err) {
      console.error('Error toggling follow:', err);
    } finally {
      setFollowLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Handler for messaging users from popup
  const handleMessageUser = (userId, event) => {
    event.stopPropagation();
    
    if (!loggedUser) {
      navigate('/login');
      return;
    }
    
    if (loggedUser._id === userId) {
      return;
    }

    navigate(`/messages/${userId}`);
  };

  // Handler for navigating to user profile from popup
  const navigateToProfile = (userId) => {
    navigate(`/user/${userId}`);
  };

  const formatConversationTime = (dateString) => {
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return format(date, "h:mm a");
    } else if (isYesterday(date)) {
      return "Yesterday";
    } else if (isThisWeek(date)) {
      return format(date, "EEEE"); 
    } else if (isThisYear(date)) {
      return format(date, "MMM d"); 
    } else {
      return format(date, "MM/dd/yyyy");
    }
  };

  const getMessagePreview = (content) => {
    if (content.length > 40) {
      return content.substring(0, 40) + "...";
    }
    return content;
  };

  if (loading) {
    return (
      <div className="page-shell text-ink p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 mx-auto mb-4 text-ocean-600 animate-spin" />
          <p className="text-xl">Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell text-ink p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <p className="text-xl mb-4">Error loading conversations</p>
          <p className="text-ink-muted mb-6">{error}</p>
          <button 
            onClick={() => fetchConversations(true)} 
            className="btn-primary !py-2 !px-4 text-white px-6 py-2 rounded-lg mr-2"
          >
            Try Again
          </button>
          <button 
            onClick={() => navigate(-1)} 
            className="btn-secondary !py-2 !px-4 px-6 py-2 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-container max-w-2xl flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <button onClick={() => navigate("/")} className="mr-4">
              <ArrowLeft size={24} className="text-ocean-600" />
            </button>
            <h1 className="section-title !text-2xl">Messages</h1>
          </div>
          
          <div className="flex items-center">
            {/* <button 
              onClick={() => navigate(`/get/${loggedUser._id}`)}                     
              className="p-2 hover:bg-paper-dark rounded-full transition-colors"
              aria-label="Contacts"
            >
              <FaUserPlus size={24} className="text-ocean-600" />
            </button> */}
            <button 
              onClick={() => setShowAllUsersPopup(true)} 
              className="p-2 hover:bg-paper-dark rounded-full transition-colors ml-2"
              aria-label="Find users to message"
              title="Discover Users"
            >
              <Globe size={24} className="text-ocean-600" />
            </button>
          </div>
        </div>
        
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-ink-muted" size={18} />
            <input
              type="text"
              placeholder="Search messages"
              value={searchTerm}
              onChange={handleSearchChange}
              className="input-field !py-2.5 !pl-10 !pr-10"
            />
            {searchTerm && (
              <button 
                onClick={clearSearch} 
                className="absolute right-3 top-3 text-ink-muted hover:text-gray-300"
              >
                <X size={18} />
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              onClick={() => handleFilterChange("all")}
              className={activeFilter === "all" ? "chip-active" : "chip-inactive"}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => handleFilterChange("unread")}
              className={activeFilter === "unread" ? "chip-active" : "chip-inactive"}
            >
              Unread
              {conversations.reduce((count, convo) => count + convo.unreadCount, 0) > 0 && (
                <span className="ml-1 bg-white/20 text-xs rounded-full px-1.5">
                  {conversations.reduce((count, convo) => count + convo.unreadCount, 0)}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => handleFilterChange("recent")}
              className={activeFilter === "recent" ? "chip-active" : "chip-inactive"}
            >
              Recent
            </button>
          </div>
        </div>
        
        {refreshing && (
          <div className="flex justify-center py-2">
            <Loader className="w-5 h-5 text-ocean-600 animate-spin" />
          </div>
        )}
        
        <div className="flex-grow overflow-y-auto">
          {filteredConversations.length === 0 ? (
            searchTerm || activeFilter !== "all" ? (
              <div className="card rounded-lg p-8 text-center">
                <Filter className="w-12 h-12 mx-auto mb-3 text-ink-faint" />
                <p className="font-semibold text-ink mb-1">No matches found</p>
                <p className="text-sm text-ink-muted mb-4">Try adjusting your search or filters</p>
                <button 
                  onClick={clearSearch} 
                  className="btn-secondary !py-2 !px-4 px-4 py-2 rounded-lg text-sm"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="card rounded-lg p-8 text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-ink-faint" />
                <p className="font-semibold text-ink mb-1">No messages yet</p>
                <p className="text-sm text-ink-muted mb-4">Start a conversation with someone</p>
                <div className="flex gap-2 justify-center">
                  <button 
                    onClick={() => setShowAllUsersPopup(true)} 
                    className="btn-primary !py-2 !px-4 px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                  >
                    <Globe size={16} />
                    Discover Users
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="space-y-2">
              {filteredConversations.map((convo) => (
                <Link
                  to={`/messages/${convo.user._id}`}
                  key={convo.user._id}
                  className="card card-hover p-4 flex items-center gap-3 !shadow-soft"
                >
                  {/* User Avatar */}
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      convo.unreadCount > 0
                        ? "bg-gradient-to-br from-ocean-400 to-fresh-500 shadow-soft"
                        : "bg-stone-100 border border-stone-200"
                    }`}
                  >
                    {convo.user.avatar ? (
                      <img 
                        src={convo.user.avatar} 
                        alt={convo.user.name} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span
                        className={`text-lg font-bold ${
                          convo.unreadCount > 0 ? "text-white" : "text-ocean-700"
                        }`}
                      >
                        {convo.user.name ? convo.user.name.slice(0, 1).toUpperCase() : "?"}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h3
                        className={`truncate ${
                          convo.unreadCount > 0 ? "font-semibold text-ink" : "font-medium text-ink-soft"
                        }`}
                      >
                        {convo.user.name}
                      </h3>
                      <span className={`text-xs whitespace-nowrap ml-2 ${convo.unreadCount > 0 ? "text-ocean-600" : "text-ink-muted"}`}>
                        {formatConversationTime(convo.lastMessage.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center">
                      {convo.lastMessage.sender === loggedUser?._id && (
                        <div className="mr-1 flex-shrink-0">
                          {convo.lastMessage.read ? (
                            <CheckCircle2 size={12} className="text-ocean-600" />
                          ) : (
                            <CheckCircle size={12} className="text-ink-muted" />
                          )}
                        </div>
                      )}
                      <p
                        className={`text-sm truncate ${
                          convo.unreadCount > 0 ? "text-ink font-medium" : "text-ink-muted"
                        }`}
                      >
                        {getMessagePreview(convo.lastMessage.content)}
                      </p>
                    </div>
                  </div>
                  
                  {convo.unreadCount > 0 && (
                    <div className="w-6 h-6 bg-ocean-600 text-white rounded-full flex items-center justify-center ml-2 shrink-0">
                      <span className="text-xs font-bold">{convo.unreadCount}</span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* All Users Popup */}
      <AllUsersPopup
        isOpen={showAllUsersPopup}
        onClose={() => setShowAllUsersPopup(false)}
        onNavigateToProfile={navigateToProfile}
        onMessageUser={handleMessageUser}
        onFollowToggle={handleFollowToggle}
        followLoading={followLoading}
      />
    </div>
  );
};

export default Conversations;