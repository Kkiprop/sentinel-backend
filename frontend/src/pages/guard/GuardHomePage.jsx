import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FiBell, 
  FiShield, 
  FiMaximize, 
  FiAlertTriangle, 
  FiBarChart2, 
  FiLogOut,
  FiUser,
  FiPlay
} from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext.jsx";
import api from "../../lib/api";
import { endpoints } from "../../lib/endpoints";

const QUICK_ACTIONS = [
  { key: "scan", label: "Scan Checkpoint", icon: <FiMaximize size={22} />, color: "#2563eb" },
  { key: "report", label: "Report Incident", icon: <FiAlertTriangle size={22} />, color: "#ea580c" },
  { key: "analytics", label: "My Shift Analytics", icon: <FiBarChart2 size={22} />, color: "#059669" },
  { key: "end", label: "End Shift", icon: <FiLogOut size={22} />, color: "#dc2626" },
];

export default function GuardHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [sites, setSites] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeShift, setActiveShift] = useState(false);

  const displayName = useMemo(() => {
    if (!user?.email) return "admin Dakada";
    return user.email.split("@")[0];
  }, [user]);

  const loadSites = async () => {
    try {
      const response = await api.get(endpoints.patrols.sites);
      setSites(response.data);
      setError("");
    } catch (sitesError) {
      setError("Unable to load assigned sites.");
    }
  };

  const refreshShiftState = async () => {
    try {
      const response = await api.get(endpoints.patrols.currentShift);
      const active = Boolean(response.data?.active);
      setActiveShift(active);
      if (!active) {
        await loadSites();
      } else {
        setSites([]);
        setError("");
      }
    } catch (shiftError) {
      setActiveShift(false);
      await loadSites();
    }
  };

  useEffect(() => {
    refreshShiftState();
  }, []);

  const getLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        () => reject(new Error("Unable to retrieve location.")),
        { enableHighAccuracy: true }
      );
    });

  const startShift = async () => {
    if (!sites.length) {
      setMessage("");
      setError("No assigned site available for starting a shift.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const { latitude, longitude } = await getLocation();
      await api.post(endpoints.patrols.startShift, {
        site_id: sites[0].id,
        latitude,
        longitude,
      });
      setActiveShift(true);
      setMessage("Shift started successfully.");
    } catch (startError) {
      const errorMessage = startError?.response?.data?.error || startError.message || "Unable to start shift.";
      if (errorMessage?.toLowerCase().includes("already has active shift")) {
        setActiveShift(true);
        setError("You already have an active shift.");
        setSites([]);
      } else {
        setError(errorMessage);
      }
    } finally {
      setBusy(false);
    }
  };

  const endShift = async () => {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const { latitude, longitude } = await getLocation();
      await api.post(endpoints.patrols.endShift, {
        latitude,
        longitude,
      });
      setActiveShift(false);
      setMessage("Shift ended successfully.");
    } catch (endError) {
      setError(endError?.response?.data?.error || endError.message || "Unable to end shift.");
    } finally {
      setBusy(false);
    }
  };

  const sendSOS = async () => {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const { latitude, longitude } = await getLocation();
      await api.post(endpoints.patrols.incidents, {
        type: "other",
        description: "SOS alert activated from guard home page.",
        latitude,
        longitude,
        created_at: new Date().toISOString(),
        client_id: `incident-sos-${Date.now()}`,
      });
      setMessage("SOS alert submitted to command.");
    } catch (sosError) {
      setError(sosError?.response?.data?.error || sosError.message || "Unable to submit SOS alert.");
    } finally {
      setBusy(false);
    }
  };

  const handleQuickAction = (key) => {
    if (key === "scan") {
      if (!activeShift) return;
      navigate("/guard/checkpoints");
      return;
    }

    if (key === "report") {
      if (!activeShift) return;
      navigate("/guard/incidents");
      return;
    }

    if (key === "analytics") {
      navigate("/guard/analytics");
      return;
    }

    if (key === "start") {
      if (!activeShift) {
        startShift();
      }
      return;
    }

    if (key === "end") {
      if (!activeShift) return;
      endShift();
      return;
    }
  };

  const nativeTapStyle = `
    .btn-tap-effect:active {
      transform: scale(0.96);
      opacity: 0.9;
      transition: transform 0.1s ease;
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
      overflow: "hidden" // Prevents the screen from scrolling entirely
    }}>
      <style>{nativeTapStyle}</style>

      {/* Clean Native Top Navbar */}
      <header style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        backgroundColor: "#ffffff",
        padding: "0.85rem 1.25rem",
        borderBottom: "1px solid #f1f5f9",
        flexShrink: 0
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: "2.25rem", height: "2.25rem", borderRadius: "50%", background: "#cbd5e1", display: "grid", placeItems: "center", overflow: "hidden" }}>
            <FiUser size={20} color="#64748b" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>Guard tour</h2>
            <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>User @{displayName}</span>
          </div>
        </div>
        <button 
          className="btn-tap-effect"
          style={{ 
            border: "none",
            background: "none", 
            cursor: "pointer",
            padding: "0.25rem"
          }}
        >
          <FiBell size={20} color="#64748b" />
        </button>
      </header>

      {/* Main Container - Compact and proportionally sized to fit inside 100vh */}
      <main style={{ 
        padding: "1rem 1.25rem", 
        display: "flex", 
        flexDirection: "column", 
        justifyContent: "space-between", 
        flexGrow: 1 
      }}>
        
        {/* Assignment & Start Shift Card */}
        <section style={{ 
          padding: "1rem 1.25rem", 
          borderRadius: "1rem", 
          background: "#ffffff", 
          boxShadow: "0 4px 18px rgba(15, 23, 42, 0.04)",
          border: "1px solid #f1f5f9"
        }}>
          {error ? (
            <p style={{ margin: 0, color: "#dc2626", fontSize: "0.9rem", marginBottom: "0.8rem" }}>{error}</p>
          ) : null}
          {message ? (
            <p style={{ margin: 0, color: "#16a34a", fontSize: "0.9rem", marginBottom: "0.8rem" }}>{message}</p>
          ) : null}
          <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#0f172a" }}>Mombasa Cement</h3>
          <span style={{ color: "#94a3b8", fontSize: "0.8rem", display: "block", marginBottom: "0.85rem" }}>Current Assignment</span>

          <button
            onClick={() => handleQuickAction("start")}
            disabled={busy || activeShift}
            className="btn-tap-effect"
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "none",
              background: activeShift ? "#94a3b8" : busy ? "#93c5fd" : "#2563eb",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: activeShift || busy ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem"
            }}
          >
            <FiPlay size={14} style={{ fill: "currentColor" }} />
            {busy ? "Working…" : "Start Shift"}
          </button>
        </section>

        {/* Central Circular SOS Target Element */}
        <section style={{ display: "flex", justifyContent: "center", alignItems: "center", flexGrow: 1 }}>
          <button
            onClick={sendSOS}
            disabled={busy || !activeShift}
            className="btn-tap-effect"
            style={{
              width: "7.5rem",
              height: "7.5rem",
              borderRadius: "50%",
              border: "none",
              background: busy || !activeShift ? "#fca5a5" : "#dc2626",
              color: "#ffffff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 20px rgba(220, 38, 38, 0.25)",
              cursor: busy || !activeShift ? "not-allowed" : "pointer",
              position: "relative"
            }}
          >
            <FiShield size={24} style={{ marginBottom: "0.15rem" }} />
            <span style={{ fontSize: "1.35rem", fontWeight: 800, letterSpacing: "0.05em", lineHeight: 1 }}>{busy ? "Sending" : "SOS"}</span>
            <span style={{ 
              fontSize: "0.5rem", 
              opacity: 0.85, 
              textTransform: "uppercase", 
              letterSpacing: "0.05em",
              position: "absolute",
              bottom: "1rem"
            }}>
            </span>
          </button>
        </section>

        {/* 2x2 Patrol Utility Block Section */}
        <section style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))", 
            gap: "0.75rem" 
          }}>
            {QUICK_ACTIONS.map((item) => {
              const isDisabled = busy && (item.key === "start" || item.key === "end") || (!activeShift && item.key !== "analytics");
              return (
                <button 
                  key={item.key}
                  onClick={() => handleQuickAction(item.key)}
                  disabled={isDisabled}
                  className="btn-tap-effect"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    padding: "1rem 0.75rem",
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    backgroundColor: isDisabled ? "#f1f5f9" : "#ffffff",
                    color: isDisabled ? "#94a3b8" : "#0f172a",
                    border: "none",
                    borderRadius: "0.75rem",
                    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.03)",
                    textAlign: "center"
                  }}
                >
                  <div style={{ color: item.color, display: "flex", alignItems: "center" }}>
                    {item.icon}
                  </div>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a", lineHeight: 1.2 }}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
        
      </main>
    </div>
  );
}