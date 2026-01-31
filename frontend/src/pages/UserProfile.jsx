import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { PinData } from "../context/PinContext";
import PinCard from "../components/PinCard";
import { UserData } from "../context/UserContext";
import { 
  UserCircle, 
  Grid, 
  Users, 
  Heart, 
  Loader, 
  MessageSquare, 
  AlertCircle, 
  Calendar, 
  Share2,
  BookmarkPlus
} from "lucide-react";
import API_BASE_URL from "../config/api";

const UserProfile = ({ user: loggedInUser }) => {
  const params = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFollow, setIsFollow] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("pins");
  const { followUser } = UserData();
  const { pins, loading: pinsLoading } = PinData();

  async function fetchUser() {
    try {
      setLoading(true);
      setError(null);
      const { data } = await axios.get(`${API_BASE_URL}/api/user/${params.id}`, { withCredentials: true });
      setUser(data);
      
      if (data.followers && loggedInUser && loggedInUser._id) {
        setIsFollow(data.followers.includes(loggedInUser._id));
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      setError(error?.response?.data?.message || "Failed to load user profile");
    } finally {
      setLoading(false);
    }
  }

  const handleMessageClick = () => {
    navigate(`/messages/${params.id}`);
  };

  const handleShareProfile = () => {
    if (navigator.share) {
      navigator.share({
        title: `${user.name}'s Profile`,
        url: window.location.href
      })
      .catch(err => console.error("Error sharing:", err));
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const followHandler = async () => {
    if (!loggedInUser || !loggedInUser._id) {
      navigate("/login");
      return;
    }
  
    try {
      setFollowLoading(true);
      
      setUser((prevUser) => ({
        ...prevUser,
        followers: isFollow
          ? prevUser.followers.filter((id) => id !== loggedInUser._id)  
          : [...prevUser.followers, loggedInUser._id], 
      }));
      
      setIsFollow(!isFollow);
  
      await followUser(user._id, fetchUser); 
    } catch (error) {
      console.error("Follow error:", error);
    } finally {
      setFollowLoading(false);
    }
  };

  const userPins = pins && user && user._id
    ? pins.filter((pin) => pin.owner === user._id)
    : [];

  const likedPins = pins && user && user._id && user.likes
    ? pins.filter((pin) => user.likes?.includes(pin._id))
    : [];

  const savedPins = pins && user && user._id && user.saved
    ? pins.filter((pin) => user.saved?.includes(pin._id))
    : [];

  useEffect(() => {
    if (params.id) {
      fetchUser();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 mx-auto mb-4 text-green-400 animate-spin" />
          <p className="text-xl">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <p className="text-xl mb-4">Error loading profile</p>
          <p className="text-gray-400 mb-6">{error}</p>
          <button 
            onClick={() => navigate(-1)} 
            className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg mr-2 transition-all"
          >
            Go Back
          </button>
          <button 
            onClick={() => fetchUser()} 
            className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <UserCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-xl mb-4">User not found</p>
          <button 
            onClick={() => navigate(-1)} 
            className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const formatJoinDate = (dateString) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getActiveContent = () => {
    if (pinsLoading) {
      return (
        <div className="flex justify-center py-12">
          <Loader className="w-10 h-10 text-green-400 animate-spin" />
        </div>
      );
    }

    let contentArray = [];
    let emptyMessage = "";

    if (activeTab === "pins") {
      contentArray = userPins;
      emptyMessage = user._id === loggedInUser?._id 
        ? "You haven't created any pins yet" 
        : "This user hasn't created any pins yet";
    } else if (activeTab === "likes") {
      contentArray = likedPins;
      emptyMessage = user._id === loggedInUser?._id 
        ? "You haven't liked any pins yet" 
        : "This user hasn't liked any pins yet";
    } else if (activeTab === "saved") {
      contentArray = savedPins;
      emptyMessage = user._id === loggedInUser?._id 
        ? "You haven't saved any pins yet" 
        : "This user hasn't saved any pins yet";
    }

    if (contentArray.length > 0) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {contentArray.map((pin) => (
            <PinCard key={pin._id} pin={pin} />
          ))}
        </div>
      );
    } else {
      return (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          {activeTab === "pins" && <Grid className="w-16 h-16 mx-auto mb-4 text-gray-600" />}
          {activeTab === "likes" && <Heart className="w-16 h-16 mx-auto mb-4 text-gray-600" />}
          {activeTab === "saved" && <BookmarkPlus className="w-16 h-16 mx-auto mb-4 text-gray-600" />}
          <p className="text-xl font-medium text-gray-400 mb-2">No {activeTab} Yet</p>
          {user._id === loggedInUser?._id && activeTab === "pins" ? (
            <>
              <p className="text-gray-500 mb-6">Start creating and sharing your pins</p>
              <button 
                onClick={() => navigate('/create')} 
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Create Pin
              </button>
            </>
          ) : (
            <p className="text-gray-500">{emptyMessage}</p>
          )}
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-800 rounded-xl shadow-xl p-8 mb-8 transition-all hover:shadow-2xl">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg transition-transform hover:scale-105">
              {user.profilePicture ? (
                <img 
                  src={user.profilePicture} 
                  alt={user.name || "User"} 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-5xl font-bold text-white">
                  {user.name ? user.name.slice(0, 1).toUpperCase() : "?"}
                </span>
              )}
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start">
                <div>
                  <h1 className="text-3xl font-bold mb-2">
                    {user.name || "Unknown User"}
                  </h1>
                  <p className="text-gray-300 mb-1">{user.email}</p>
                  <p className="text-gray-400 text-sm mb-4 flex items-center justify-center md:justify-start">
                    <Calendar size={16} className="mr-1 text-green-400" />
                    Joined {formatJoinDate(user.createdAt)}
                  </p>
                </div>
                
               
              </div>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-6">
                <div className="bg-gray-700 rounded-lg px-4 py-2 flex items-center transition-all hover:bg-gray-600">
                  <Grid size={18} className="mr-2 text-green-400" />
                  <div>
                    <p className="text-sm text-gray-400">Pins</p>
                    <p className="text-xl font-bold">{userPins.length}</p>
                  </div>
                </div>
                
                <div className="bg-gray-700 rounded-lg px-4 py-2 flex items-center transition-all hover:bg-gray-600 cursor-pointer"
                     onClick={() => navigate(`/get/${user._id}`)}>
                  <Users size={18} className="mr-2 text-green-400" />
                  <div>
                    <p className="text-sm text-gray-400">Followers</p>
                    <p className="text-xl font-bold">{user.followers ? user.followers.length : 0}</p>
                  </div>
                </div>
                
                <div className="bg-gray-700 rounded-lg px-4 py-2 flex items-center transition-all hover:bg-gray-600 cursor-pointer"
                     onClick={() => navigate(`/get/${user._id}`)}>
                  <Heart size={18} className="mr-2 text-green-400" />
                  <div>
                    <p className="text-sm text-gray-400">Following</p>
                    <p className="text-xl font-bold">{user.following ? user.following.length : 0}</p>
                  </div>
                </div>

                {user.bio && (
                  <div className="w-full mt-2 bg-gray-700 rounded-lg p-3">
                    <p className="text-gray-300">{user.bio}</p>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                {loggedInUser && user._id !== loggedInUser._id && (
                  <button
                    onClick={followHandler}
                    disabled={followLoading}
                    className={`${
                      isFollow 
                        ? "bg-gray-700 hover:bg-gray-600" 
                        : "bg-green-600 hover:bg-green-700"
                    } text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2`}
                  >
                    {followLoading ? (
                      <Loader size={18} className="animate-spin mr-2" />
                    ) : isFollow ? (
                      <Users size={18} className="mr-2" />
                    ) : (
                      <UserCircle size={18} className="mr-2" />
                    )}
                    {followLoading 
                      ? "Processing..." 
                      : isFollow 
                        ? "Unfollow" 
                        : "Follow"}
                  </button>
                )}
                
                {loggedInUser && user._id !== loggedInUser._id && (
                  <button
                    onClick={handleMessageClick}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <MessageSquare size={18} className="mr-1" />
                    Message
                  </button>
                )}
                
                {loggedInUser && user._id === loggedInUser._id && (
                  <button
                    onClick={() => navigate('/create')}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Grid size={18} className="mr-1" />
                    Create Pin
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-6 flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab("pins")}
            className={`px-6 py-3 font-medium flex items-center transition-colors ${
              activeTab === "pins" 
                ? "text-green-400 border-b-2 border-green-400" 
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <Grid size={18} className="mr-2" />
            Pins
          </button>
          
    
        </div>
        
        <div>
          {getActiveContent()}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;