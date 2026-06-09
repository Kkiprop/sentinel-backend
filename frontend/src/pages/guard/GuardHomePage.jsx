import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FiShield, 
  FiMaximize, 
  FiAlertTriangle, 
  FiCalendar,
  FiLogOut,
  FiPlay
} from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext.jsx";
import api from "../../lib/api";
import { endpoints } from "../../lib/endpoints";

const QUICK_ACTIONS = [
  { key: "scan", label: "Scan Checkpoint", icon: <FiMaximize size={20} />, color: "#2563eb" },
  { key: "report", label: "Report Incident", icon: <FiAlertTriangle size={20} />, color: "#ea580c" },
  { key: "myShift", label: "My Shift", icon: <FiCalendar size={20} />, color: "#059669" },
  { key: "end", label: "End Shift", icon: <FiLogOut size={20} />, color: "#dc2626" },
];

export default function GuardHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [sites, setSites] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeShift, setActiveShift] = useState(false);
  
  // State to track SOS long-press progress
  const [sosProgress, setSosProgress] = useState(0);
  const sosTimerRef = useRef(null);
  const sosIntervalRef = useRef(null);

  const displayName = useMemo(() => {
    if (!user?.email) return "admin Dakada";
    return user.email.split("@")[0];
  }, [user]);

  const triggerHaptic = (duration = 50) => {
    if (navigator.vibrate) {
      navigator.vibrate(duration);
    }
  };

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
      setError("No assigned site available.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");
    triggerHaptic(100);

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
    triggerHaptic(100);

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
    triggerHaptic([200, 100, 200]); // Distinct SOS vibration pattern

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

  // Safe SOS Press handlers to avoid accidental triggers
  const handleSosPressStart = (e) => {
    if (busy || !activeShift) return;
    e.preventDefault();
    triggerHaptic(30);

    sosTimerRef.current = setTimeout(() => {
      clearInterval(sosIntervalRef.current);
      setSosProgress(100);
      sendSOS();
    }, 1500); // 1.5 seconds hold required

    sosIntervalRef.current = setInterval(() => {
      setSosProgress((prev) => Math.min(prev + (100 / 15), 100));
    }, 100);
  };

  const handleSosPressEnd = () => {
    clearTimeout(sosTimerRef.current);
    clearInterval(sosIntervalRef.current);
    setSosProgress(0);
  };

  const handleQuickAction = (key) => {
    triggerHaptic(40);
    
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

    if (key === "myShift") {
      navigate("/guard/my-shift");
      return;
    }

    if (key === "end") {
      if (!activeShift) return;
      endShift();
      return;
    }
  };

  return (
    <div
      style={{
        background: "#f8fafc",
        minHeight: "100%",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        WebkitUserSelect: "none",
        userSelect: "none",
        overflow: "visible",
      }}
    >
      <style>{`
        .btn-tap-effect:active {
          transform: scale(0.96);
          transition: all .1s ease;
        }
        .sos-active-pulse {
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(220,38,38,0.4); }
          70% { box-shadow: 0 0 0 15px rgba(220,38,38,0); }
          100% { box-shadow: 0 0 0 0 rgba(220,38,38,0); }
        }
      `}</style>

      <main
        style={{
          maxWidth: "480px",
          minHeight: "100%",
          margin: "0 auto",
          padding: "1.25rem 1rem 5.5rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between", // Dynamic spacing redistribution
          gap: "1rem",
          boxSizing: "border-box",
        }}
      >
        {/* Header Section */}
        <section style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: "#0f172a" }}>
              Hi, {displayName}
            </h1>
            <p style={{ margin: "0.15rem 0 0 0", color: "#64748b", fontSize: "0.85rem" }}>
              Mombasa Cement
            </p>
          </div>
          <div
            style={{
              padding: "0.35rem 0.75rem",
              borderRadius: "999px",
              background: activeShift ? "#dcfce7" : "#fef3c7",
              color: activeShift ? "#166534" : "#92400e",
              fontSize: "0.75rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "0.25rem"
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: activeShift ? "#166534" : "#92400e" }}></span>
            {activeShift ? "Shift Active" : "Shift Inactive"}
          </div>
        </section>

        {/* Feedback Messages (Absolute overlay wrapper to preserve flex layout proportions) */}
        {(error || message) && (
          <div style={{ position: "relative", zIndex: 10 }}>
            {error && (
              <div style={{ padding: "0.75rem", borderRadius: "0.75rem", background: "#fef2f2", color: "#dc2626", fontSize: "0.85rem", fontWeight: 500 }}>
                {error}
              </div>
            )}
            {message && (
              <div style={{ padding: "0.75rem", borderRadius: "0.75rem", background: "#f0fdf4", color: "#16a34a", fontSize: "0.85rem", fontWeight: 500 }}>
                {message}
              </div>
            )}
          </div>
        )}

        {/* Shift Control Box */}
        {!activeShift && (
          <section
            style={{
              background: "#fff",
              borderRadius: "1rem",
              padding: "1rem",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 12px rgba(15,23,42,0.03)",
            }}
          >
            <button
              onClick={() => startShift()}
              disabled={busy}
              className="btn-tap-effect"
              style={{
                width: "100%",
                border: "none",
                borderRadius: "0.75rem",
                padding: "0.85rem",
                background: busy ? "#93c5fd" : "#2563eb",
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.95rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
              }}
            >
              <FiPlay />
              {busy ? "Starting..." : "Clock In / Start Shift"}
            </button>
          </section>
        )}

        {/* Centerpiece SOS Section */}
        <section
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "10.5rem",
              height: "10.5rem",
              borderRadius: "50%",
              background: "rgba(220,38,38,.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Circular Progress Border */}
            <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
              <circle
                cx="5.25rem"
                cy="5.25rem"
                r="4.9rem"
                fill="transparent"
                stroke={activeShift ? "rgba(220,38,38,0.15)" : "#e2e8f0"}
                strokeWidth="5"
              />
              <circle
                cx="5.25rem"
                cy="5.25rem"
                r="4.9rem"
                fill="transparent"
                stroke="#dc2626"
                strokeWidth="5"
                strokeDasharray={2 * Math.PI * 78} 
                strokeDashoffset={2 * Math.PI * 78 * (1 - sosProgress / 100)}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.1s linear" }}
              />
            </svg>

            <button
              onMouseDown={handleSosPressStart}
              onMouseUp={handleSosPressEnd}
              onMouseLeave={handleSosPressEnd}
              onTouchStart={handleSosPressStart}
              onTouchEnd={handleSosPressEnd}
              disabled={busy || !activeShift}
              className={`btn-tap-effect ${activeShift && !busy ? "sos-active-pulse" : ""}`}
              style={{
                width: "8.5rem",
                height: "8.5rem",
                borderRadius: "50%",
                border: "none",
                background: busy || !activeShift ? "#cbd5e1" : "#dc2626",
                color: "#fff",
                cursor: busy || !activeShift ? "not-allowed" : "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: activeShift ? "0 12px 28px rgba(220,38,38,.25)" : "none",
                zIndex: 2,
              }}
            >
              <FiShield size={32} />
              <div style={{ marginTop: "0.25rem", fontSize: "1.75rem", fontWeight: 900, letterSpacing: ".02em" }}>
                {busy ? "..." : "SOS"}
              </div>
              <div style={{ fontSize: "0.55rem", opacity: 0.85, fontWeight: 600, marginTop: "0.15rem" }}>
                {activeShift ? "HOLD TO TRIGGER" : "SHIFT INACTIVE"}
              </div>
            </button>
          </div>
        </section>

        {/* Unified Operations Quick Actions Grid */}
        <section>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "0.75rem",
            }}
          >
            {QUICK_ACTIONS.map((item) => {
              const isDisabled = !activeShift && item.key !== "analytics";

              return (
                <button
                  key={item.key}
                  onClick={() => handleQuickAction(item.key)}
                  disabled={isDisabled}
                  className="btn-tap-effect"
                  style={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.85rem",
                    padding: "0.95rem 0.5rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    boxShadow: "0 4px 12px rgba(15,23,42,.02)",
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    opacity: isDisabled ? 0.45 : 1,
                  }}
                >
                  <div
                    style={{
                      width: "2.6rem",
                      height: "2.6rem",
                      borderRadius: "0.65rem",
                      background: `${item.color}12`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: item.color,
                    }}
                  >
                    {item.icon}
                  </div>

                  <span
                    style={{
                      fontSize: "0.825rem",
                      fontWeight: 700,
                      color: "#1e293b",
                      textAlign: "center",
                      lineHeight: 1.2,
                    }}
                  >
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