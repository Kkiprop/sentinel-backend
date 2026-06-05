import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FiMail, 
  FiUser, 
  FiMapPin, 
  FiShield, 
  FiLogOut, 
  FiChevronRight, 
  FiFileText, 
  FiAlertCircle 
} from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext.jsx";

export default function GuardProfilePage() {
  const { user, logout } = useAuth(); // Extracted logout function from AuthContext
  const navigate = useNavigate();

  const fullName = useMemo(() => {
    return `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "Guard Officer";
  }, [user]);

  const handleLogout = async () => {
    try {
      if (logout) {
        await logout();
        navigate("/login");
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const nativeTapStyle = `
    .btn-tap-effect:active {
      transform: scale(0.97);
      opacity: 0.9;
      transition: transform 0.1s ease;
    }
    .list-row-tap:active {
      background-color: #f1f5f9 !important;
    }
  `;

  return (
    <div style={{ 
      backgroundColor: "#f8fafc", 
      height: "100vh", 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      WebkitUserSelect: "none",
      userSelect: "none",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }}>
      <style>{nativeTapStyle}</style>

      {/* Native App Top Header Block */}
      <header style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center",
        backgroundColor: "#ffffff",
        padding: "1rem 1.25rem",
        borderBottom: "1px solid #f1f5f9",
        flexShrink: 0
      }}>
        <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>My Profile</h2>
      </header>

      {/* Main Container Layout */}
      <main style={{ 
        padding: "1.25rem 1.25rem 2rem 1.25rem", 
        display: "flex", 
        flexDirection: "column", 
        justifyContent: "space-between", 
        flexGrow: 1 
      }}>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Identity Info Card */}
          <section style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "1rem",
            padding: "1rem 0"
          }}>
            <div style={{ 
              width: "4rem", 
              height: "4rem", 
              borderRadius: "50%", 
              background: "#2563eb", 
              display: "grid", 
              placeItems: "center",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)"
            }}>
              <FiUser size={32} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700, color: "#0f172a" }}>{fullName}</h3>
              <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.025em" }}>
                {user?.role || "Security Personnel"}
              </span>
            </div>
          </section>

          {/* Core Credentials Group Block */}
          <section style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <span style={{ margin: "0 0 0.15rem 0.25rem", fontSize: "0.8rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Employment Context
            </span>
            <div style={{ 
              backgroundColor: "#ffffff", 
              borderRadius: "0.85rem", 
              border: "1px solid #e2e8f0",
              overflow: "hidden"
            }}>
              {/* Row 1: Email */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", padding: "0.85rem 1rem", borderBottom: "1px solid #f1f5f9" }}>
                <FiMail size={18} color="#64748b" style={{ flexShrink: 0 }} />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>Email Node</span>
                  <span style={{ fontSize: "0.95rem", color: "#334155", fontWeight: 500 }}>{user?.email || "No email linked"}</span>
                </div>
              </div>

              {/* Row 2: Authority level */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", padding: "0.85rem 1rem", borderBottom: "1px solid #f1f5f9" }}>
                <FiShield size={18} color="#64748b" style={{ flexShrink: 0 }} />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>Clearance Rank</span>
                  <span style={{ fontSize: "0.95rem", color: "#334155", fontWeight: 500, textTransform: "capitalize" }}>{user?.role || "General Guard"}</span>
                </div>
              </div>

              {/* Row 3: Deployment Station */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", padding: "0.85rem 1rem" }}>
                <FiMapPin size={18} color="#64748b" style={{ flexShrink: 0 }} />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>Assigned Station</span>
                  <span style={{ fontSize: "0.95rem", color: "#334155", fontWeight: 500 }}>{user?.company ? `Company ${user.company}` : "Mombasa Headquarters"}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Action List Group Block */}
          <section style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <span style={{ margin: "0 0 0.15rem 0.25rem", fontSize: "0.8rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Quick Utilities
            </span>
            <div style={{ 
              backgroundColor: "#ffffff", 
              borderRadius: "0.85rem", 
              border: "1px solid #e2e8f0",
              overflow: "hidden"
            }}>
              <div 
                onClick={() => navigate("/guard/analytics")}
                className="list-row-tap"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem", borderBottom: "1px solid #f1f5f9", cursor: "pointer", transition: "background-color 0.1s" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <FiFileText size={18} color="#0f172a" />
                  <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#0f172a" }}>View Shift Log Records</span>
                </div>
                <FiChevronRight size={18} color="#cbd5e1" />
              </div>

              <div 
                onClick={() => navigate("/guard/incidents")}
                className="list-row-tap"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem", cursor: "pointer", transition: "background-color 0.1s" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <FiAlertCircle size={18} color="#0f172a" />
                  <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#0f172a" }}>Report Infrastructure Issue</span>
                </div>
                <FiChevronRight size={18} color="#cbd5e1" />
              </div>
            </div>
          </section>
        </div>

        {/* Unified Native Trigger Session Actions Area */}
        <div>
          <button
            onClick={handleLogout}
            className="btn-tap-effect"
            style={{
              width: "100%",
              padding: "1rem",
              borderRadius: "0.85rem",
              border: "none",
              background: "#fee2e2",
              color: "#dc2626",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem"
            }}
          >
            <FiLogOut size={18} />
            Log Out Session
          </button>
        </div>

      </main>
    </div>
  );
}