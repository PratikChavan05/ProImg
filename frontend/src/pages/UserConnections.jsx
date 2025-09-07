import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  UserCircle, 
  UserPlus, 
  UserMinus, 
  AlertCircle, 
  ChevronLeft, 
  Search, 
  Users, 
  Heart,
  Loader,
  MessageSquare,
  Globe
} from 'lucide-react';
import AllUsersPopup from '../components/AllUsersPopup';

const UserConnections = () => {
  const [userData, setUserData] = useState({ followers: [], following: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('followers');
  const [followLoading, setFollowLoading] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userName, setUserName] = useState('');
  const [showAllUsersPopup, setShowAllUsersPopup] = useState(false);
  
  const { id } = useParams(); 
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await axios.get('/api/user/me');
        setCurrentUser(response.data);
      } catch (err) {
        console.error('Error fetching current user:', err);
      }
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const fetchUserConnections = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/user/get/${id}`);
        setUserData(response.data);
        setUserName(response.data.name || 'User');
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Error fetching user data');
        console.error('Error fetching user connections:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserConnections();
  }, [id]);

  const handleFollowToggle = async (userId, event) => {
    event.stopPropagation();
    
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    if (currentUser._id === userId) {
      return;
    }

    setFollowLoading(prev => ({ ...prev, [userId]: true }));
    
    try {
      const response = await axios.post(`/api/user/follow/${userId}`);

      const isFollowing = currentUser?.following?.includes(userId);
      
      if (isFollowing) {
        setCurrentUser(prev => ({
          ...prev,
          following: prev.following.filter(id => id !== userId)
        }));

        if (id === userId) {
          setUserData(prev => ({
            ...prev,
            followers: prev.followers.filter(user => user._id !== currentUser._id)
          }));
        }
      } else {
        setCurrentUser(prev => ({
          ...prev,
          following: [...(prev.following || []), userId]
        }));

        if (id === userId) {
          setUserData(prev => ({
            ...prev,
            followers: [...prev.followers, currentUser]
          }));
        }
      }
      
    } catch (err) {
      console.error('Error toggling follow:', err);
    } finally {
      setFollowLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleMessageUser = (userId, event) => {
    event.stopPropagation();
    
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    if (currentUser._id === userId) {
      return;
    }

    navigate(`/messages/${userId}`);
  };

  const navigateToProfile = (userId) => {
    navigate(`/user/${userId}`);
  };

  const isFollowing = (userId) => {
    return currentUser && currentUser.following && currentUser.following.includes(userId);
  };

  const getFilteredUsers = (users, query = searchQuery) => {
    if (!query) return users;
    
    return users.filter(user => 
      user.name?.toLowerCase().includes(query.toLowerCase()) || 
      user.email?.toLowerCase().includes(query.toLowerCase())
    );
  };

  const renderUserCard = (user) => (
    <div 
      key={user._id} 
      className="flex items-center p-5 rounded-xl bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-all duration-300 shadow-lg cursor-pointer"
      onClick={() => navigateToProfile(user._id)}
    >
      <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md">
        {user.profilePicture ? (
          <img 
            src={user.profilePicture} 
            alt={user.name} 
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          user.name?.charAt(0).toUpperCase() || <UserCircle size={16} />
        )}
      </div>
      <div className="ml-4 flex-1">
        <h3 className="font-medium text-white text-lg">{user.name}</h3>
      </div>
      {currentUser && currentUser._id !== user._id && (
        <div className="flex items-center">
          <button
            onClick={(e) => handleMessageUser(user._id, e)}
            className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white mr-2 transition-all duration-200"
            aria-label="Message user"
            title="Send message"
          >
            <MessageSquare size={18} />
          </button>
          <button
            onClick={(e) => handleFollowToggle(user._id, e)}
            disabled={followLoading[user._id]}
            className={`p-2 rounded-lg flex items-center ${
              isFollowing(user._id)
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            } transition-colors duration-200`}
          >
            {followLoading[user._id] ? (
              <Loader size={18} className="animate-spin" />
            ) : isFollowing(user._id) ? (
              <>
                <UserMinus size={18} className="mr-2" />
                <span></span>
              </>
            ) : (
              <>
                <UserPlus size={18} className="mr-2" />
                <span></span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );

  const renderUserList = (users) => {
    const filteredUsers = getFilteredUsers(users);
    
    if (filteredUsers.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center py-12">
          <Users size={48} className="text-gray-600 mb-4" />
          <p className="text-gray-400 text-lg">
            {searchQuery ? 'No matching users found' : 'No users found'}
          </p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredUsers.map((user) => renderUserCard(user))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="text-center">
          <Loader className="w-12 h-12 mx-auto mb-4 text-green-400 animate-spin" />
          <p className="text-xl text-white">Loading user connections...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <p className="text-xl mb-4 text-white">Error loading connections</p>
          <p className="text-gray-400 mb-6">{error}</p>
          <button 
            onClick={() => navigate(-1)} 
            className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg mr-2 text-white transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button 
              onClick={() => navigate(-1)} 
              className="mr-4 p-2 rounded-full hover:bg-gray-700 transition-colors"
              aria-label="Go back"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center">
                {userName}'s Connections
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                {activeTab === 'followers' ? 'People who follow this user' : 'People this user follows'}
              </p>
            </div>
          </div>
          
          <button 
                        onClick={() => setShowAllUsersPopup(true)} 
                        className="p-2 hover:bg-gray-700 rounded-full transition-colors ml-2"
                        aria-label="Find users to message"
                        title="Discover Users"
                      >
                        <Globe size={24} className="text-green-400" />
                      </button>
        </div>
        
        <div className="mb-8">
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg py-3 pl-10 pr-4 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
          </div>
          
          <div className="border-b border-gray-700">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('followers')}
                className={`py-4 px-6 text-center border-b-2 font-medium flex items-center ${
                  activeTab === 'followers'
                    ? 'border-green-400 text-green-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                } transition-all duration-200`}
              >
                <Users size={18} className="mr-2" />
                Followers ({userData.followers?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('following')}
                className={`py-4 px-6 text-center border-b-2 font-medium flex items-center ${
                  activeTab === 'following'
                    ? 'border-green-400 text-green-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                } transition-all duration-200`}
              >
                <Heart size={18} className="mr-2" />
                Following ({userData.following?.length || 0})
              </button>
            </nav>
          </div>
        </div>

        <div className="bg-gray-800 bg-opacity-50 rounded-xl p-6 shadow-xl border border-gray-700">
          {activeTab === 'followers' ? (
            <div>
              <h2 className="text-xl font-semibold mb-6 text-green-400">People who follow {userName}</h2>
              {renderUserList(userData.followers || [])}
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold mb-6 text-green-400">People {userName} follows</h2>
              {renderUserList(userData.following || [])}
            </div>
          )}
        </div>
      </div>

      <AllUsersPopup
        isOpen={showAllUsersPopup}
        onClose={() => setShowAllUsersPopup(false)}
        currentUser={currentUser}
        onNavigateToProfile={navigateToProfile}
        onMessageUser={handleMessageUser}
        onFollowToggle={handleFollowToggle}
        followLoading={followLoading}
      />
    </div>
  );
};

export default UserConnections;