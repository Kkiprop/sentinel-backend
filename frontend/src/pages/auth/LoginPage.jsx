import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { endpoints } from "../../lib/endpoints";
import { loadOfflineUser, loadOfflinePin, verifyOfflinePin } from "../../lib/auth";
import { saveOfflineShifts, saveOfflineIncidents } from "../../lib/offline.js";
import { FiLock, FiShield, FiWifi, FiSmartphone } from "react-icons/fi";

export default function LoginPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [form, setForm] = useState({ email: "", password: "", pin: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [offlineUser, setOfflineUser] = useState(null);
  const [offlinePin, setOfflinePin] = useState("");

  useEffect(() => {
    const loadOfflineCredentials = async () => {
      const [savedUser, savedPin] = await Promise.all([loadOfflineUser(), loadOfflinePin()]);
      setOfflineUser(savedUser);
      setOfflinePin(savedPin || "");
    };

    loadOfflineCredentials();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === "pin") {
      const digits = value.replace(/\D/g, "");
      setForm((prev) => ({ ...prev, [name]: digits.slice(0, 4) }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    if (offlineMode) {
      if (!offlineUser) {
        setError("Offline access unavailable. Please log in online first.");
        setLoading(false);
        return;
      }
      if (!(await verifyOfflinePin(form.pin))) {
        setError("Invalid PIN.");
        setLoading(false);
        return;
      }
      auth.loginOffline(offlineUser);
      navigate(offlineUser.role === "admin" ? "/admin" : "/guard");
      return;
    }

    try {
      const { data } = await api.post(endpoints.auth.login, { email: form.email, password: form.password });
      auth.login({ access: data.access, refresh: data.refresh, user: data.user });
      navigate(data.user?.role === "admin" ? "/admin" : "/guard");
    } catch (e) {
      setError("Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#ffffff",
      padding: "1.5rem",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: "400px" }}>
        {/* Header Section */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{ 
            width: "4rem", height: "4rem", background: "#f1f5f9", 
            borderRadius: "1.25rem", display: "grid", placeItems: "center",
            margin: "0 auto 1.5rem", color: "#2563eb"
          }}>
            <FiShield size={32} />
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.5rem" }}>
            {offlineMode ? "Offline Access" : "Command Access"}
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
            {offlineMode ? "Enter your security PIN to continue." : "Sign in to your account."}
          </p>
        </div>

        {/* Input Group */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {!offlineMode ? (
            <>
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Work Email" style={inputStyle} required />
              <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Password" style={inputStyle} required />
            </>
          ) : (
            <input type="text" name="pin" value={form.pin} onChange={handleChange} placeholder="0000" maxLength={4} style={{...inputStyle, textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.5rem"}} inputMode="numeric" required />
          )}
        </div>

        {error && <p style={{ color: "#e11d48", fontSize: "0.85rem", marginTop: "1rem", textAlign: "center", fontWeight: 600 }}>{error}</p>}

        {/* Action Buttons */}
        <button type="submit" disabled={loading} style={primaryButtonStyle}>
          {loading ? "Authenticating..." : offlineMode ? "Unlock" : "Sign In"}
        </button>

        <button type="button" onClick={() => setOfflineMode(!offlineMode)} style={secondaryButtonStyle}>
          {offlineMode ? <><FiWifi size={16}/> Use Online Login</> : <><FiSmartphone size={16}/> Use Offline PIN</>}
        </button>
      </form>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "1rem",
  borderRadius: "0.85rem",
  border: "1px solid #e2e8f0",
  backgroundColor: "#f8fafc",
  fontSize: "0.95rem",
  boxSizing: "border-box",
  outline: "none",
  transition: "border 0.2s"
};

const primaryButtonStyle = {
  width: "100%",
  padding: "1rem",
  background: "#2563eb",
  color: "#ffffff",
  border: "none",
  borderRadius: "0.85rem",
  marginTop: "1.5rem",
  fontWeight: 700,
  fontSize: "1rem",
  cursor: "pointer"
};

const secondaryButtonStyle = {
  width: "100%",
  padding: "1rem",
  background: "transparent",
  color: "#64748b",
  border: "none",
  marginTop: "0.5rem",
  fontWeight: 600,
  fontSize: "0.9rem",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.5rem"
};