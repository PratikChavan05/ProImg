import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
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
import { FaUserPlus } from "react-icons/fa";
import AllUsersPopup from "../components/AllUsersPopup"; // Import the popup component

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
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const fetchConversations = useCallback(async (showRefreshIndicator = true) => {
    if (showRefreshIndicator) {
      setRefreshing(true);
    }
    
    try {
      const { data } = await axios.get("/api/message/conversations");
      setConversations(data);
      applyFilters(data, searchTerm, activeFilter);
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error("Error fetching conversations:", err);
      setError(err?.response?.data?.message || "Failed to load conversations");
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchTerm, activeFilter]);

  useEffect(() => {
    fetchConversations(false);
    
    const intervalId = setInterval(() => {
      fetchConversations(false);
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [fetchConversations]);

  const applyFilters = (conversations, search, filter) => {
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
      await axios.post(`/api/user/follow/${userId}`);
      // You might want to update the logged user's following list here
      // This depends on how you manage user state in your app
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
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 mx-auto mb-4 text-green-400 animate-spin" />
          <p className="text-xl">Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <p className="text-xl mb-4">Error loading conversations</p>
          <p className="text-gray-400 mb-6">{error}</p>
          <button 
            onClick={() => fetchConversations(true)} 
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg mr-2"
          >
            Try Again
          </button>
          <button 
            onClick={() => navigate(-1)} 
            className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4">
      <div className="max-w-2xl mx-auto flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <button onClick={() => navigate("/")} className="mr-4">
              <ArrowLeft size={24} className="text-green-400" />
            </button>
            <h1 className="text-2xl font-bold">Messages</h1>
          </div>
          
          <div className="flex items-center">
            {/* <button 
              onClick={() => navigate(`/get/${loggedUser._id}`)}                     
              className="p-2 hover:bg-gray-700 rounded-full transition-colors"
              aria-label="Contacts"
            >
              <FaUserPlus size={24} className="text-green-400" />
            </button> */}
            <button 
              onClick={() => setShowAllUsersPopup(true)} 
              className="p-2 hover:bg-gray-700 rounded-full transition-colors ml-2"
              aria-label="Find users to message"
              title="Discover Users"
            >
              <Globe size={24} className="text-green-400" />
            </button>
          </div>
        </div>
        
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search messages"
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 pl-10 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {searchTerm && (
              <button 
                onClick={clearSearch} 
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-300"
              >
                <X size={18} />
              </button>
            )}
          </div>
          
          <div className="flex mt-3 border-b border-gray-700 pb-2">
            <button 
              onClick={() => handleFilterChange("all")}
              className={`mr-4 pb-2 text-sm font-medium ${
                activeFilter === "all" 
                  ? "text-green-400 border-b-2 border-green-400" 
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              All
            </button>
            <button 
              onClick={() => handleFilterChange("unread")}
              className={`mr-4 pb-2 text-sm font-medium ${
                activeFilter === "unread" 
                  ? "text-green-400 border-b-2 border-green-400" 
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Unread
              {conversations.reduce((count, convo) => count + convo.unreadCount, 0) > 0 && (
                <span className="ml-1 bg-green-500 text-xs rounded-full px-2 py-0.5">
                  {conversations.reduce((count, convo) => count + convo.unreadCount, 0)}
                </span>
              )}
            </button>
            <button 
              onClick={() => handleFilterChange("recent")}
              className={`mr-4 pb-2 text-sm font-medium ${
                activeFilter === "recent" 
                  ? "text-green-400 border-b-2 border-green-400" 
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Recent
            </button>
          </div>
        </div>
        
        {refreshing && (
          <div className="flex justify-center py-2">
            <Loader className="w-5 h-5 text-green-400 animate-spin" />
          </div>
        )}
        
        <div className="flex-grow overflow-y-auto">
          {filteredConversations.length === 0 ? (
            searchTerm || activeFilter !== "all" ? (
              <div className="bg-gray-800 rounded-lg p-8 text-center">
                <Filter className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p className="text-xl font-medium text-gray-400 mb-2">No matches found</p>
                <p className="text-gray-500 mb-6">Try adjusting your search or filters</p>
                <button 
                  onClick={clearSearch} 
                  className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-8 text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p className="text-xl font-medium text-gray-400 mb-2">No Messages Yet</p>
                <p className="text-gray-500 mb-6">Start a conversation with someone</p>
                <div className="flex gap-2 justify-center">
                  <button 
                    onClick={() => setShowAllUsersPopup(true)} 
                    className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2"
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
                  className="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 flex items-center transition-colors"
                >
                  {/* User Avatar */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 mr-4 ${
                    convo.unreadCount > 0 ? "bg-gradient-to-br from-green-400 to-emerald-600" : "bg-gray-700"
                  }`}>
                    {convo.user.avatar ? (
                      <img 
                        src={convo.user.avatar} 
                        alt={convo.user.name} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold text-white">
                        {convo.user.name ? convo.user.name.slice(0, 1).toUpperCase() : "?"}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className={`truncate ${convo.unreadCount > 0 ? "font-bold text-white" : "font-medium text-gray-200"}`}>
                        {convo.user.name}
                      </h3>
                      <span className={`text-xs whitespace-nowrap ml-2 ${convo.unreadCount > 0 ? "text-green-400" : "text-gray-400"}`}>
                        {formatConversationTime(convo.lastMessage.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center">
                      {convo.lastMessage.sender === currentUser._id && (
                        <div className="mr-1 flex-shrink-0">
                          {convo.lastMessage.read ? (
                            <CheckCircle2 size={12} className="text-green-400" />
                          ) : (
                            <CheckCircle size={12} className="text-gray-400" />
                          )}
                        </div>
                      )}
                      <p className={`text-sm truncate ${convo.unreadCount > 0 ? "text-white" : "text-gray-400"}`}>
                        {getMessagePreview(convo.lastMessage.content)}
                      </p>
                    </div>
                  </div>
                  
                  {convo.unreadCount > 0 && (
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center ml-3 flex-shrink-0">
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
        currentUser={loggedUser}
        onNavigateToProfile={navigateToProfile}
        onMessageUser={handleMessageUser}
        onFollowToggle={handleFollowToggle}
        followLoading={followLoading}
      />
    </div>
  );
};

export default Conversations;