import { usePinStore } from "../store/pinStore";
import { useAuthStore } from "../store/authStore";
import { useEffect, createContext, useContext } from "react";

const PinContext = createContext();

export const PinProvider = ({ children }) => {
  const fetchPins = usePinStore((state) => state.fetchPins);
  const isAuth = useAuthStore((state) => state.isAuth);

  useEffect(() => {
    if (isAuth) {
      fetchPins();
    }
  }, [isAuth, fetchPins]);

  return (
    <PinContext.Provider value={{}}>
      {children}
    </PinContext.Provider>
  );
};

export const PinData = () => {
  const store = usePinStore();

  // Expose compatibility layer mapping to original Pin Context APIs
  return {
    pins: store.pins || [],
    loading: store.loading,
    pin: store.pin || [],
    fetchPin: store.fetchPin,
    updatePin: store.updatePin,
    addComment: store.addComment,
    deleteComment: store.deleteComment,
    deletePin: store.deletePin,
    addPin: store.addPin,
    likePin: store.likePin,
    fetchPins: store.fetchPins,
    feedMode: store.feedMode,
    recordView: store.recordView
  };
};