import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { getCurrentUser, verifyOtp, logout as logoutService, sendOtp } from "../services/authService";
import { joinRealtimeRoom, disconnectSocket } from "../services/socket";
import { requestNotificationPermission } from "../services/notify";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getCurrentUser());

  useEffect(() => {
    if (user) {
      joinRealtimeRoom({ role: user.role, phone: user.phone, shopId: user.shopId });
      requestNotificationPermission();
    }
  }, [user]);

  const requestOtp = useCallback(async (identifier, role) => {
    return sendOtp(identifier, role);
  }, []);

  const login = useCallback(async ({ phone, email, otp, role, name, shopName, firebaseVerified }) => {
    const loggedInUser = await verifyOtp({ phone, email, otp, role, name, shopName, firebaseVerified });
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(() => {
    logoutService();
    disconnectSocket();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, requestOtp }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
