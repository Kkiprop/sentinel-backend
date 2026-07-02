import { createContext, useContext, useMemo, useState } from "react";
import { clearAuthTokens, clearAuthUser, getAccessToken, getUser, setAuthTokens, setAuthUser, getOfflineUser, setOfflineUser, clearOfflineAuth } from "../lib/auth";
import { Navigate } from "react-router-dom";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const initialUser = getUser();
  const [user, setUser] = useState(initialUser);

  const login = ({ access, refresh, user }) => {
    setAuthTokens({ access, refresh });
    setAuthUser(user);
    setOfflineUser(user);
    setUser(user);
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
