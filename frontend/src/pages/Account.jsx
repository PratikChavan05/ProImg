import React, { useEffect, useState } from "react";
import { PinData } from "../context/PinContext";
import PinCard from "../components/PinCard";
import toast from "react-hot-toast";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { UserData } from "../context/UserContext";
import { LogOut, UserCircle, Grid, Loader } from "lucide-react";

const Account = ({ user }) => {
  const navigate = useNavigate();
  const { setIsAuth, setUser,fetchUser } = UserData();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { pins, loading } = PinData();

  // Handle logout with loading state
  const logoutHandler = async () => {
    try {
      setIsLoggingOut(true);
      const { data } = await axios.get("/api/user/logout");
      toast.success(data.message);
      navigate("/login");
      setIsAuth(false);
      setUser([]);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Logout failed");
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Filter pins safely
  const userPins = pins && user && user._id
    ? pins.filter((pin) => pin.owner === user._id)
    : [];

  useEffect(() => {
    fetchUser();
  
    
  }, [])
  

  // Handle case where user data isn't available
  if (!user || !user._id) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 mx-auto mb-4 text-green-400 animate-spin" />
          <p className="text-xl">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <div className="bg-gray-800 rounded-xl shadow-xl p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Profile Image */}
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg">
              <span className="text-5xl font-bold text-white">
                {user.name ? user.name.slice(0, 1).toUpperCase() : "?"}
              </span>
            </div>
            
            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold mb-2">
                {user.name ? user.name.toUpperCase() : "User"}
              </h1>
              <p className="text-gray-300 mb-4">{user.email}</p>
              
              {/* Stats */}
              <div className="flex flex-wrap justify-center md:justify-start gap-6 mb-4">
                <div className="bg-gray-700 rounded-lg px-4 py-2">
                  <p className="text-sm text-gray-400">Pins</p>
                  <p className="text-xl font-bold">{userPins.length}</p>
                </div>
                
                <div className="bg-gray-700 rounded-lg px-4 py-2">
                  <p className="text-sm text-gray-400">Followers</p>
                  <p className="text-xl font-bold"
                  onClick={() => navigate(`/get/${user._id}`)}
                  >{user.followers ? user.followers.length : 0}</p>
                </div>
                
                <div className="bg-gray-700 rounded-lg px-4 py-2">
                  <p className="text-sm text-gray-400">Following</p>
                  <p className="text-xl font-bold"
                  onClick={() => navigate(`/get/${user._id}`)}
                  >{user.following ? user.following.length : 0}</p>
                </div>
              </div>
              
              {/* Actions */}
              <div>
                <button
                  onClick={logoutHandler}
                  disabled={isLoggingOut}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isLoggingOut ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      <span>Logging out...</span>
                    </>
                  ) : (
                    <>
                      <LogOut size={18} />
                      <span>Logout</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Pins Section */}
        <div>
          <div className="flex items-center mb-6">
            <Grid className="mr-2 text-green-400" />
            <h2 className="text-2xl font-bold">Your Pins</h2>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader className="w-10 h-10 text-green-400 animate-spin" />
            </div>
          ) : userPins.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {userPins.map((pin) => (
                <PinCard key={pin._id} pin={pin} />
              ))}
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <UserCircle className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p className="text-xl font-medium text-gray-400 mb-2">No Pins Yet</p>
              <p className="text-gray-500 mb-6">Start creating and sharing your pins</p>
              <button 
                onClick={() => navigate('/create')} 
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Create Pin
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Account;