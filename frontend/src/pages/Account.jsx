import React, { useEffect, useState } from "react";
import { PinData } from "../context/PinContext";
import PinCard from "../components/PinCard";
import {toast} from "react-toastify";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { UserData } from "../context/UserContext";
import { LogOut, UserCircle, Grid, Loader, Heart } from "lucide-react";

const Account = ({ user }) => {
  const navigate = useNavigate();
  const { setIsAuth, setUser, fetchUser,isAuth } = UserData();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { pins, loading } = PinData();
  const [likedPins, setLikedPins] = useState([]);
  const [activeTab, setActiveTab] = useState("yourPins");

  const logoutHandler = async () => {
    try {
      setIsLoggingOut(true);
      const { data } = await axios.get("/api/user/logout");
      toast.success(data.message);
      setIsAuth(false);
      setUser([]);
      navigate("/login");
    
      
    } catch (error) {
      toast.error(error?.response?.data?.message || "Logout failed");
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    if (!isAuth) {
      navigate("/login");
    }
  }, []);


  const userPins = pins && user && user._id ? pins.filter((pin) => pin.owner === user._id) : [];

  useEffect(() => {
    const fetchLikedPins = async () => {
      if (!user || !user._id) return;
      try {
        const { data } = await axios.get(`/api/pin/liked/${user._id}`);
        setLikedPins(data.pins);
      } catch (error) {
        toast.error("Failed to fetch liked pins");
      }
    };

    fetchUser();
    fetchLikedPins();
  }, [user]);

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
        <div className="bg-gray-800 rounded-xl shadow-xl p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg">
              <span className="text-5xl font-bold text-white">
                {user.name ? user.name.slice(0, 1).toUpperCase() : "?"}
              </span>
            </div>

            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold mb-2">{user.name ? user.name.toUpperCase() : "User"}</h1>
              <p className="text-gray-300 mb-4">{user.email}</p>

              <div className="flex flex-wrap justify-center md:justify-start gap-6 mb-4">
                <div className="bg-gray-700 rounded-lg px-4 py-2">
                  <p className="text-sm text-gray-400">Pins</p>
                  <p className="text-xl font-bold">{userPins.length}</p>
                </div>

                <div className="bg-gray-700 rounded-lg px-4 py-2 cursor-pointer" onClick={() => navigate(`/get/${user._id}`)}>
                  <p className="text-sm text-gray-400">Followers</p>
                  <p className="text-xl font-bold">{user.followers ? user.followers.length : 0}</p>
                </div>

                <div className="bg-gray-700 rounded-lg px-4 py-2 cursor-pointer" onClick={() => navigate(`/get/${user._id}`)}>
                  <p className="text-sm text-gray-400">Following</p>
                  <p className="text-xl font-bold">{user.following ? user.following.length : 0}</p>
                </div>
              </div>

              <div className="flex gap-4 flex-wrap justify-center md:justify-start">
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
                <button
                  onClick={() => navigate('/create')}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Grid size={18} />
                  <span>Create Pin</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex border-b border-gray-600 mb-6">
          <button
            className={`px-4 py-2 text-lg font-medium ${activeTab === "yourPins" ? "border-b-2 border-green-400 text-green-400" : "text-gray-400"}`}
            onClick={() => setActiveTab("yourPins")}
          >
            <UserCircle size={18} className="inline-block mr-1" />
            Your Pins
          </button>
          <button
            className={`px-4 py-2 text-lg font-medium ${activeTab === "likedPins" ? "border-b-2 border-green-400 text-green-400" : "text-gray-400"}`}
            onClick={() => setActiveTab("likedPins")}
          >
            <Heart size={18} className="inline-block mr-1" />
            Liked Pins
          </button>
        </div>

        {activeTab === "yourPins" ? (
          loading ? (
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
            <p className="text-gray-400 text-center">No Pins Yet</p>
          )
        ) : (
          likedPins.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {likedPins.map((pin) => (
                <PinCard key={pin._id} pin={pin} />
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center">No Liked Pins</p>
          )
        )}
      </div>
    </div>
  );
};

export default Account;
