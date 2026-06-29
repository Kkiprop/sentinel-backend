import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FiMail, 
  FiMapPin, 
  FiShield, 
  FiLogOut, 
  FiChevronRight, 
  FiFileText, 
  FiAlertCircle 
} from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { getOfflinePin, setOfflinePin } from "../../lib/auth";

export default function GuardProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Computes fallback display name strings safely
  const fullName = useMemo(() => {
    return `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "Guard Officer";
  }, [user]);

  // Generates 2-character initials placeholder emblem for a native account feel
  const initials = useMemo(() => {
    if (user?.first_name || user?.last_name) {
      return `${user?.first_name?.[0] || ""}${user?.last_name?.[0] || ""}`.toUpperCase();
    }
    return user?.email ? user.email.slice(0, 2).toUpperCase() : "GO";
  }, [user]);

  const [pinInput, setPinInput] = useState("");
  const [pinStatus, setPinStatus] = useState("");
  const [pinConfigured, setPinConfigured] = useState(false);

  useEffect(() => {
    setPinConfigured(Boolean(getOfflinePin()));
  }, []);

  const handlePinChange = (event) => {
    const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
    setPinInput(digits);
  };

  const savePin = () => {
    if (!/^\d{4}$/.test(pinInput)) {
      setPinStatus("Enter a valid 4-digit PIN.");
      return;
    }
    setOfflinePin(pinInput);
    setPinConfigured(true);
    setPinStatus("Offline PIN saved locally. Offline login is now enabled.");
    setPinInput("");
  };

  const clearPin = () => {
    setOfflinePin("");
    setPinConfigured(false);
    setPinStatus("Offline PIN cleared.");
  };

  const handleLogout = async () => {
    try {
      if (logout) {
        await logout();
        navigate("/login");
      }
    } catch (error) {
      console.error("Logout runtime context failure:", error);
    }
  };

  const nativeTapStyle = `
    .btn-tap-effect {
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .btn-tap-effect:active {
      transform: scale(0.98);
      opacity: 0.95;
    }
    .list-row-tap {
      transition: all 0.15s ease;
    }
    .list-row-tap:hover {
      background-color: #f8fafc !important;
    }
    .list-row-tap:active {
      background-color: #f1f5f9 !important;
    }
  `;

  return (
    <div style={{ 
      backgroundColor: "#f4f6f9", 
      minHeight: "100vh", 
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      WebkitUserSelect: "none",
      userSelect: "none",
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    }}>
      <style>{nativeTapStyle}</style>

      {/* Main View Shell Layer (Restricts desktop blow-out while scaling seamlessly on mobile) */}
      <div style={{
        width: "100%",
        maxWidth: "480px",
        backgroundColor: "#ffffff",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 0 24px rgba(15, 23, 42, 0.03)",
        borderLeft: "1px solid #eef2f6",
        borderRight: "1px solid #eef2f6"
      }}>
        
        {/* Native App Top Header Block */}
        <header style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center",
          backgroundColor: "#ffffff",
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid #f1f5f9",
          position: "sticky",
          top: 0,
          zIndex: 50
        }}>
          <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em" }}>Account Profile</h2>
        </header>

        {/* Main Workspace Scroll Body Container */}
        <main style={{ 
          padding: "1.5rem", 
          display: "flex", 
          flexDirection: "column", 
          justifyContent: "space-between", 
          flexGrow: 1
        }}>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
            {/* Identity Hero Profile Badge Header Card */}
            <section style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "1.25rem",
              padding: "0.25rem 0"
            }}>
              <div style={{ 
                width: "4.25rem", 
                height: "4.25rem", 
                borderRadius: "1.25rem", 
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", 
                display: "grid", 
                placeItems: "center",
                boxShadow: "0 8px 20px rgba(37, 99, 235, 0.15)",
                color: "#ffffff",
                fontSize: "1.4rem",
                fontWeight: 700,
                letterSpacing: "0.05em"
              }}>
                {initials}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>{fullName}</h3>
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <span style={{ 
                    fontSize: "0.75rem", 
                    color: "#2563eb", 
                    backgroundColor: "#eff6ff", 
                    padding: "0.15rem 0.5rem", 
                    borderRadius: "0.375rem", 
                    fontWeight: 600, 
                    textTransform: "uppercase", 
                    letterSpacing: "0.025em" 
                  }}>
                    {user?.role || "Active Personnel"}
                  </span>
                </div>
              </div>
            </section>

            {/* Core Credentials Context Group Data Grid Container */}
            <section style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span style={{ margin: "0 0 0.15rem 0.25rem", fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Deployment Context
              </span>
              <div style={{ 
                backgroundColor: "#ffffff", 
                borderRadius: "1rem", 
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 12px rgba(15, 23, 42, 0.015)",
                overflow: "hidden"
              }}>
                {/* Row 1: Email Profile Metadata Anchor */}
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.25rem", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ width: "2rem", height: "2rem", borderRadius: "0.5rem", backgroundColor: "#f8fafc", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <FiMail size={16} color="#64748b" />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                    <span style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em" }}>Email Address</span>
                    <span style={{ fontSize: "0.95rem", color: "#334155", fontWeight: 600 }}>{user?.email || "No email linked"}</span>
                  </div>
                </div>

                {/* Row 2: Authority Level */}
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.25rem", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ width: "2rem", height: "2rem", borderRadius: "0.5rem", backgroundColor: "#f8fafc", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <FiShield size={16} color="#64748b" />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                    <span style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em" }}>Security Designation</span>
                    <span style={{ fontSize: "0.95rem", color: "#334155", fontWeight: 600, textTransform: "capitalize" }}>{user?.role || "General Guard"}</span>
                  </div>
                </div>

                {/* Row 3: Deployment Station Assignment Field */}
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.25rem" }}>
                  <div style={{ width: "2rem", height: "2rem", borderRadius: "0.5rem", backgroundColor: "#f8fafc", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <FiMapPin size={16} color="#64748b" />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                    <span style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em" }}>Assigned Station</span>
                    <span style={{ fontSize: "0.95rem", color: "#334155", fontWeight: 600 }}>{user?.company ? `Company ${user.company}` : "Mombasa Headquarters"}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Offline PIN Setup Block */}
            <section style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <span style={{ margin: "0 0 0.15rem 0.25rem", fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Offline PIN Access
              </span>
              <div style={{ backgroundColor: "#ffffff", borderRadius: "1rem", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(15, 23, 42, 0.015)", padding: "1rem 1.25rem" }}>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "#475569" }}>
                  {pinConfigured ? "Offline PIN is configured. Email login will be disabled when offline." : "Set a 4-digit PIN for offline access."}
                </p>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem", alignItems: "center" }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\\d{4}"
                    maxLength={4}
                    value={pinInput}
                    onChange={handlePinChange}
                    placeholder="1234"
                    style={{ width: "7rem", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1", fontSize: "0.95rem", color: "#0f172a" }}
                  />
                  <button
                    type="button"
                    onClick={savePin}
                    className="btn-tap-effect"
                    style={{ padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "none", background: "#2563eb", color: "#fff", fontWeight: 700, cursor: "pointer" }}
                  >
                    Save PIN
                  </button>
                  {pinConfigured && (
                    <button
                      type="button"
                      onClick={clearPin}
                      className="btn-tap-effect"
                      style={{ padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #f1f5f9", background: "#ffffff", color: "#475569", cursor: "pointer" }}
                    >
                      Clear PIN
                    </button>
                  )}
                </div>
                {pinStatus ? <p style={{ marginTop: "0.75rem", color: "#475569", fontSize: "0.9rem" }}>{pinStatus}</p> : null}
              </div>
            </section>

            {/* Action Group Interaction Block */}
            <section style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span style={{ margin: "0 0 0.15rem 0.25rem", fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Quick Utilities
              </span>
              <div style={{ 
                backgroundColor: "#ffffff", 
                borderRadius: "1rem", 
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 12px rgba(15, 23, 42, 0.015)",
                overflow: "hidden"
              }}>
                <div 
                  onClick={() => navigate("/guard/analytics")}
                  className="list-row-tap"
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ width: "2rem", height: "2rem", borderRadius: "0.5rem", backgroundColor: "#f0fdf4", display: "grid", placeItems: "center" }}>
                      <FiFileText size={16} color="#16a34a" />
                    </div>
                    <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1e293b" }}>View Shift Log Records</span>
                  </div>
                  <FiChevronRight size={18} color="#94a3b8" />
                </div>

                <div 
                  onClick={() => navigate("/guard/incidents")}
                  className="list-row-tap"
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", cursor: "pointer" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ width: "2rem", height: "2rem", borderRadius: "0.5rem", backgroundColor: "#fff7ed", display: "grid", placeItems: "center" }}>
                      <FiAlertCircle size={16} color="#ea580c" />
                    </div>
                    <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1e293b" }}>Report Infrastructure Issue</span>
                  </div>
                  <FiChevronRight size={18} color="#94a3b8" />
                </div>
              </div>
            </section>
          </div>

          {/* Unified Clean Destructive Trigger Area */}
          <div style={{ marginTop: "2.5rem" }}>
            <button
              onClick={handleLogout}
              className="btn-tap-effect"
              style={{
                width: "100%",
                padding: "1rem",
                borderRadius: "1rem",
                border: "1px solid #fca5a5",
                background: "#fff5f5",
                color: "#dc2626",
                fontWeight: 700,
                fontSize: "0.95rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                boxShadow: "0 4px 12px rgba(220, 38, 38, 0.03)"
              }}
            >
              <FiLogOut size={16} />
              Log Out Session
            </button>
          </div>

        </main>
      </div>
    </div>
  );
}