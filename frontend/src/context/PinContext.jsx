import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";
import { UserData } from "./UserContext";
import { toast } from "react-toastify";
// import { set } from "mongoose";
import { CodeSquare } from "lucide-react";

const PinContext = createContext();

export const PinProvider = ({ children }) => {
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuth} = UserData();

  async function fetchPins() {
    try {
      const { data } = await axios.get("/api/pin/all");

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
      const { data } = await axios.get("/api/pin/" + id);

      setPin(data);
      setLoading(false);
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  }

  async function updatePin(id, title, pin, setEdit) {
    try {
      const { data } = await axios.put("/api/pin/" + id, { title, pin });
      toast.success(data.message);
      fetchPin(id);
      setEdit(false);
    } catch (error) {
      toast.error(error.response.data.message);
    }
  }

  async function addComment(id, comment, setComment) {
    try {
      const { data } = await axios.post("/api/pin/comment/" + id, { comment });
      toast.success(data.message);
      fetchPin(id);
      setComment("");
    } catch (error) {
      toast.error(error.response.data.message);
    }
  }

  async function likePin(id) {
    try {
      const { data } = await axios.post("/api/pin/like/" + id);
      toast.success(data.message);
      fetchPin(id);
    } catch (error) {
      toast.error(error.response.data.message);
    }
  }

  // const [likes, setLikes] = useState([])
 
  // async function getCountOfLikes(id) {
  //   try {
  //     console.log("id", id);
  //     const { data } = await axios.get("/api/pin/likes/" + id);
  //     setLikes(data.id);
  //     console.log(data.id);
  //   } catch (error) {
  //     console.log(error);
  //   }
  // }

  async function deleteComment(id, commentId) {
    try {
      const { data } = await axios.delete(
        `/api/pin/comment/${id}?commentId=${commentId}`
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
      const { data } = await axios.delete(`/api/pin/${id}`);
      toast.success(data.message);
      navigate("/");
      setLoading(false);
      fetchPins();
    } catch (error) {
      toast.error(error.response.data.message);
      setLoading(false);
    }
  }

  async function addPin(
    formData,
    setFilePrev,
    setFile,
    setTitle,
    setPin,
    navigate
  ) 
  
  {
    setLoading(true);
    try {
      const { data } = await axios.post("/api/pin/new", formData);

      toast.success(data.message);
      setFile([]);
      setFilePrev("");
      setPin("");
      setTitle("");
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
        // getCountOfLikes,
        // likes,
        fetchPins,
      }}
    >
      {children}
    </PinContext.Provider>
  );
};

export const PinData = () => useContext(PinContext);
