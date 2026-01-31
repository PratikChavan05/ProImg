import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";
import { UserData } from "./UserContext";
import { toast } from "react-toastify";
import API_BASE_URL from "../config/api";

const PinContext = createContext();

export const PinProvider = ({ children }) => {
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuth } = UserData();

  async function fetchPins() {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/pin/all`, { withCredentials: true });
      setPins(data);
      setLoading(false);
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  }

  const [pin, setPin] = useState([]);

  async function fetchPin(id) {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/pin/${id}`, { withCredentials: true });
      setPin(data);
      setLoading(false);
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  }

  async function updatePin(id, title, pin, setEdit) {
    try {
      const { data } = await axios.put(`${API_BASE_URL}/api/pin/${id}`, { title, pin }, { withCredentials: true });
      toast.success(data.message);
      fetchPin(id);
      setEdit(false);
    } catch (error) {
      toast.error(error.response.data.message);
    }
  }

  async function addComment(id, comment, setComment) {
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/pin/comment/${id}`, { comment }, { withCredentials: true });
      toast.success(data.message);
      fetchPin(id);
      setComment("");
    } catch (error) {
      toast.error(error.response.data.message);
    }
  }

  async function likePin(id) {
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/pin/like/${id}`, {}, { withCredentials: true });
      toast.success(data.message);
      fetchPin(id);
    } catch (error) {
      toast.error(error.response.data.message);
    }
  }

  async function deleteComment(id, commentId) {
    try {
      const { data } = await axios.delete(
        `${API_BASE_URL}/api/pin/comment/${id}?commentId=${commentId}`, { withCredentials: true }
      );
      toast.success(data.message);
      fetchPin(id);
    } catch (error) {
      toast.error(error.response.data.message);
    }
  }

  async function deletePin(id, navigate) {
    setLoading(true);
    try {
      const { data } = await axios.delete(`${API_BASE_URL}/api/pin/${id}`, { withCredentials: true });
      toast.success(data.message);
      navigate("/");
      setLoading(false);
      fetchPins();
    } catch (error) {
      toast.error(error.response.data.message);
      setLoading(false);
    }
  }

  // Simplified addPin function
  async function addPin(formData, navigate) {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/pin/new`, formData, { withCredentials: true });
      toast.success(data.message);
      setLoading(false);
      fetchPins();
      navigate("/");
    } catch (error) {
      toast.error(error.response.data.message);
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPins();
  }, [isAuth]);

  return (
    <PinContext.Provider
      value={{
        pins,
        loading,
        fetchPin,
        pin,
        updatePin,
        addComment,
        deleteComment,
        deletePin,
        addPin,
        likePin,
        fetchPins,
      }}
    >
      {children}
    </PinContext.Provider>
  );
};

export const PinData = () => useContext(PinContext);