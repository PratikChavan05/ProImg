import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  UserCircle, 
  UserPlus, 
  UserMinus, 
  AlertCircle, 
  Search, 
  Users, 
  Loader,
  MessageSquare,
  X,
  Globe
} from 'lucide-react';

const AllUsersPopup = ({ 
  isOpen, 
  onClose, 
  currentUser, 
  onNavigateToProfile, 
  onMessageUser, 
  onFollowToggle, 
  followLoading = {} 
}) => {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchAllUsers();
    } else {
      // Reset state when popup closes
      setSearchQuery('');
      setError(null);
    }
  }, [isOpen]);

  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/user/all');
      setAllUsers(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error fetching users');
      console.error('Error fetching all users:', err);
    } finally {
      setLoading(false);
    }
  };

  const isFollowing = (userId) => {
    return currentUser && currentUser.following && currentUser.following.includes(userId);
  };

  const getFilteredUsers = () => {
    let filteredUsers = allUsers;
    
    // Filter by search query
    if (searchQuery) {
      filteredUsers = allUsers.filter(user => 
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Exclude current user
    return filteredUsers.filter(user => user._id !== currentUser?._id);
  };

  const handleCardClick = (userId) => {
    onClose();
    onNavigateToProfile(userId);
  };

  const handleMessageClick = (userId, event) => {
    event.stopPropagation();
    onClose();
    onMessageUser(userId, event);
  };

  const renderUserCard = (user) => (
    <div 
      key={user._id} 
      className="flex items-center p-5 rounded-xl bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-all duration-300 shadow-lg cursor-pointer"
      onClick={() => handleCardClick(user._id)}
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
            onClick={(e) => handleMessageClick(user._id, e)}
            className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white mr-2 transition-all duration-200"
            aria-label="Message user"
            title="Send message"
          >
            <MessageSquare size={18} />
          </button>
          <button
            onClick={(e) => onFollowToggle(user._id, e)}
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

  if (!isOpen) return null;

  const filteredUsers = getFilteredUsers();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl w-full max-w-4xl max-h-[80vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center">
            <Globe size={24} className="text-green-400 mr-3" />
            <div>
              <h2 className="text-2xl font-bold text-white">All Users</h2>
              <p className="text-gray-400 text-sm">Discover and connect with other users</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-700">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search all users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg py-3 pl-10 pr-4 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <Loader className="w-8 h-8 mx-auto mb-4 text-green-400 animate-spin" />
                <p className="text-gray-400">Loading users...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-400" />
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  onClick={fetchAllUsers}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-white transition-all"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <div>
              {filteredUsers.length === 0 ? (
                <div className="flex flex-col justify-center items-center py-12">
                  <Users size={48} className="text-gray-600 mb-4" />
                  <p className="text-gray-400 text-lg">
                    {searchQuery ? 'No matching users found' : 'No users available'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredUsers.map((user) => renderUserCard(user))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllUsersPopup;