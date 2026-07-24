import { createContext, useContext, useMemo, useState } from "react";
import { clearAuthTokens, clearAuthUser, getAccessToken, getUser, setAuthTokens, setAuthUser, getOfflineUser, setOfflineUser, clearOfflineAuth } from "../lib/auth";
import { registerDeviceToken, detectPlatform } from "../lib/deviceToken";
import { Navigate } from "react-router-dom";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const initialUser = getUser();
  const [user, setUser] = useState(initialUser);

  const login = async ({ access, refresh, user }) => {
    setAuthTokens({ access, refresh });
    setAuthUser(user);
    setOfflineUser(user);
    setUser(user);

    // Register device token for push notifications
    try {
      const platform = detectPlatform();
      await registerDeviceToken(platform);
    } catch (error) {
      console.warn("Device token registration failed:", error);
    }
  };

  const loginOffline = (offlineUser) => {
    setUser(offlineUser);
  };

  const logout = () => {
    clearAuthTokens();
    clearAuthUser();
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      login,
      loginOffline,
      logout,
      isAuthenticated: Boolean(user),
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function RequireAuth({ children }) {
  const auth = useAuth();

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
