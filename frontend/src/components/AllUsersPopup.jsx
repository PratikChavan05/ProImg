import React, { useState, useEffect } from 'react';
import customAxios from '../config/axios';
import { useAuthStore } from '../store/authStore';
import { 
  UserCircle, 
  UserPlus, 
  UserMinus,
  Clock,
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
  onNavigateToProfile, 
  onMessageUser, 
  onFollowToggle, 
  followLoading = {} 
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const toggleFollow = useAuthStore((s) => s.toggleFollow);
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
      const response = await customAxios.get('/api/user/all');
      setAllUsers(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Error fetching users');
      console.error('Error fetching all users:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRelationship = (u) =>
    u.relationship ||
    (currentUser?.following || []).some((f) => (f._id || f).toString() === u._id?.toString()
      ? "following"
      : "none");

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
      className="flex items-center p-4 rounded-xl border border-paper-200 bg-paper-50 hover:border-ocean-200 transition cursor-pointer"
      onClick={() => handleCardClick(user._id)}
    >
      <div className="w-12 h-12 bg-gradient-to-br from-ocean-400 to-fresh-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md">
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
        <h3 className="font-medium text-ink">{user.name}</h3>
      </div>
      {currentUser && currentUser._id !== user._id && (
        <div className="flex items-center">
          {user.canMessage && (
            <button
              onClick={(e) => handleMessageClick(user._id, e)}
              className="btn-ghost !p-2 mr-2"
              aria-label="Message user"
              title="Send message"
            >
              <MessageSquare size={18} />
            </button>
          )}
          <button
            type="button"
            onClick={async (e) => {
              e.stopPropagation();
              try {
                if (onFollowToggle) {
                  await onFollowToggle(user._id, e);
                  await fetchAllUsers();
                } else {
                  const result = await toggleFollow(user._id);
                  const rel =
                    result.relationship ||
                    (result.followStatus === "requested"
                      ? "requested"
                      : result.followStatus === "following"
                        ? "following"
                        : "none");
                  setAllUsers((prev) =>
                    prev.map((u) =>
                      u._id?.toString() === user._id?.toString() ? { ...u, relationship: rel } : u
                    )
                  );
                }
              } catch {
                /* toast in store */
              }
            }}
            disabled={followLoading[user._id]}
            className={
              getRelationship(user) === "following" || getRelationship(user) === "requested"
                ? "btn-secondary !py-2"
                : "btn-primary !py-2 !px-3"
            }
          >
            {followLoading[user._id] ? (
              <Loader size={18} className="animate-spin" />
            ) : getRelationship(user) === "following" ? (
              <UserMinus size={18} />
            ) : getRelationship(user) === "requested" ? (
              <Clock size={18} />
            ) : (
              <UserPlus size={18} />
            )}
          </button>
        </div>
      )}
    </div>
  );

  if (!isOpen) return null;

  const filteredUsers = getFilteredUsers();

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-paper-200">
          <div className="flex items-center gap-3">
            <Globe size={24} className="text-ocean-600" />
            <div>
              <h2 className="text-xl font-display font-semibold text-ink">Discover people</h2>
              <p className="text-ink-muted text-sm">Find users to follow and message</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost !p-2" aria-label="Close">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 border-b border-paper-200">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
            <input
              type="search"
              placeholder="Search by name or email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field !pl-10"
            />
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader className="w-8 h-8 text-ocean-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-500" />
              <p className="text-red-600 mb-4">{error}</p>
              <button type="button" onClick={fetchAllUsers} className="btn-primary">
                Try again
              </button>
            </div>
          ) : (
            <div>
              {filteredUsers.length === 0 ? (
                <div className="flex flex-col justify-center items-center py-12 text-ink-muted">
                  <Users size={48} className="text-ink-faint mb-4" />
                  <p>{searchQuery ? 'No matching users' : 'No users available'}</p>
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