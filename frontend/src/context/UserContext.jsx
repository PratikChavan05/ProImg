import { useAuthStore } from "../store/authStore";
import { usePinStore } from "../store/pinStore";
import { useEffect, createContext, useContext } from "react";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const fetchUser = useAuthStore((state) => state.fetchUser);
  const syncReplicas = useAuthStore((state) => state.syncReplicas);
  const isAuth = useAuthStore((state) => state.isAuth);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      await fetchUser({ silent: false });
      if (cancelled) return;
      if (useAuthStore.getState().isAuth && !sessionStorage.getItem("proimg-replicas-synced")) {
        await syncReplicas({ silent: true });
        sessionStorage.setItem("proimg-replicas-synced", "1");
      }
    };
    boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on app load
  }, []);

  useEffect(() => {
    if (!isAuth) sessionStorage.removeItem("proimg-replicas-synced");
  }, [isAuth]);

  return (
    <UserContext.Provider value={{}}>
      {children}
    </UserContext.Provider>
  );
};

export const UserData = () => {
  const store = useAuthStore();
  const fetchPins = usePinStore((state) => state.fetchPins);

  // Expose direct compatibility layer mapping to original Context APIs
  return {
    user: store.user,
    isAuth: store.isAuth,
    btnLoading: store.btnLoading,
    loading: store.loading,
    loginUser: (email, password, navigate) => store.loginUser(email, password, navigate, fetchPins),
    forgotUser: store.forgotUser,
    resetUser: store.resetUser,
    registerUser: store.registerUser,
    verify: (token, otp, navigate) => store.verify(token, otp, navigate, fetchPins),
    fetchUser: (opts) => store.fetchUser(opts),
    followUser: store.followUser,
    toggleFollow: store.toggleFollow,
    updatePrivacy: store.updatePrivacy,
    fetchFollowRequests: store.fetchFollowRequests,
    acceptFollowRequest: store.acceptFollowRequest,
    rejectFollowRequest: store.rejectFollowRequest,
    setIsAuth: store.setIsAuth,
    setUser: store.setUser,
    createPaymentOrder: store.createPaymentOrder,
    verifyPayment: store.verifyPayment,
    cancelPremium: store.cancelPremium
  };
};
