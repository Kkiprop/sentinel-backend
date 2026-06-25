import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { 
  FiShield, 
  FiMaximize, 
  FiAlertTriangle, 
  FiCalendar,
  FiLogOut,
  FiPlay,
  FiMapPin
} from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext.jsx";
import api from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import {
  appendLocalRecord,
  enqueueOfflineAction,
  loadCachedSites,
  saveCachedSites,
  loadOfflineShiftState,
  saveOfflineShiftState,
  isOnline,
  isNetworkError,
} from "../../lib/offline.js";

// Custom Leaflet marker setup to resolve default asset path issues
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import markerShadowPng from "leaflet/dist/images/marker-shadow.png";

const customIcon = new L.Icon({
  iconUrl: markerIconPng,
  shadowUrl: markerShadowPng,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const QUICK_ACTIONS = [
  { key: "scan", label: "Scan Checkpoint", icon: <FiMaximize size={16} />, color: "#2563eb" },
  { key: "report", label: "Report Incident", icon: <FiAlertTriangle size={16} />, color: "#ea580c" },
  { key: "myShift", label: "My Shift", icon: <FiCalendar size={16} />, color: "#059669" },
  { key: "end", label: "End Shift", icon: <FiLogOut size={16} />, color: "#dc2626" },
];

export default function GuardHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [sites, setSites] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeShift, setActiveShift] = useState(false);
  
  // Refactored to handle collections of active markers
  const [mapCoordinates, setMapCoordinates] = useState([]); 
  
  // State to track SOS long-press progress
  const [sosProgress, setSosProgress] = useState(0);
  const sosTimerRef = useRef(null);
  const sosIntervalRef = useRef(null);

  const SVG_RADIUS = 78;
  const SVG_CIRCUMFERENCE = 2 * Math.PI * SVG_RADIUS;

  const displayName = useMemo(() => {
    if (!user?.email) return "admin Dakada";
    return user.email.split("@")[0];
  }, [user]);

  const triggerHaptic = useCallback((duration = 50) => {
    if (navigator.vibrate) {
      navigator.vibrate(duration);
    }
  }, []);

  // Fetches live operational data and converts active items into renderable layout markers
  const fetchActiveShiftMapData = useCallback(async () => {
    try {
      const response = await api.get("api/patrols/manage/shifts");
      const shiftsArray = Array.isArray(response.data) ? response.data : [];

      // Filter for explicitly active rows containing valid starting positional entries
      const processedActiveMarkers = shiftsArray
        .filter(
          (shift) =>
            shift.status === "active" &&
            shift.start_latitude &&
            shift.start_longitude
        )
        .map((shift) => ({
          id: shift.id,
          lat: parseFloat(shift.start_latitude),
          lng: parseFloat(shift.start_longitude),
          label: `Active Shift #${shift.id} — Guard ${shift.guard} at Site ${shift.site}`,
        }));

      if (processedActiveMarkers.length > 0) {
        setMapCoordinates(processedActiveMarkers);
      } else {
        // Fallback to local self tracking coordinates if cluster returns vacant
        navigator.geolocation.getCurrentPosition((pos) => {
          setMapCoordinates([
            {
              id: "fallback-self-pin",
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              label: "Your Location (No remote active sessions running)",
            },
          ]);
        });
      }
    } catch (err) {
      console.error("Error connecting to live tracking shifts cluster API", err);
      navigator.geolocation.getCurrentPosition((pos) => {
        setMapCoordinates([
          {
            id: "fallback-err-pin",
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            label: "Your Current Location",
          },
        ]);
      });
    }
  }, []);

  const loadSites = useCallback(async () => {
    try {
      const response = await api.get(endpoints.patrols.sites);
      setSites(response.data);
      saveCachedSites(response.data);
      setError("");
    } catch (sitesError) {
      const cachedSites = loadCachedSites();
      if (cachedSites?.length) {
        setSites(cachedSites);
        setError("Offline: showing cached assigned sites.");
      } else {
        setError("Unable to load assigned sites.");
      }
    }
  }, []);

  const refreshShiftState = useCallback(async () => {
    try {
      const response = await api.get(endpoints.patrols.currentShift);
      const active = Boolean(response.data?.active);
      setActiveShift(active);
      fetchActiveShiftMapData();
      if (!active) {
        await loadSites();
      } else {
        setSites([]);
        setError("");
      }
    } catch (shiftError) {
      const offlineShift = loadOfflineShiftState();
      if (offlineShift?.active) {
        setActiveShift(true);
        setError("Offline: restored active shift from local device.");
      } else {
        setActiveShift(false);
        await loadSites();
      }
      fetchActiveShiftMapData();
    }
  }, [fetchActiveShiftMapData, loadSites]);

  useEffect(() => {
    refreshShiftState();

    return () => {
      if (sosTimerRef.current) clearTimeout(sosTimerRef.current);
      if (sosIntervalRef.current) clearInterval(sosIntervalRef.current);
    };
  }, [refreshShiftState]);

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
      const payload = {
        site_id: sites[0].id,
        latitude,
        longitude,
        created_at: new Date().toISOString(),
        client_id: `shift-start-${Date.now()}`,
      };

      await api.post(endpoints.patrols.startShift, payload);
      setActiveShift(true);
      saveOfflineShiftState({
        active: true,
        siteId: sites[0].id,
        latitude,
        longitude,
        startedAt: payload.created_at,
      });
      setMessage("Shift started successfully.");
      fetchActiveShiftMapData();
    } catch (startError) {
      const errorMessage = startError?.response?.data?.error || startError.message || "Unable to start shift.";
      if (!isOnline() || isNetworkError(startError)) {
        const payload = {
          site_id: sites[0].id,
          latitude: null,
          longitude: null,
          created_at: new Date().toISOString(),
          client_id: `shift-start-${Date.now()}`,
        };
        enqueueOfflineAction({
          endpoint: endpoints.patrols.startShift,
          payload,
          category: "shift",
          type: "start",
          method: "post",
        });
        saveOfflineShiftState({
          active: true,
          siteId: sites[0].id,
          latitude: null,
          longitude: null,
          startedAt: payload.created_at,
        });
        setActiveShift(true);
        setMessage("Offline: shift started locally and queued for sync.");
      } else if (errorMessage?.toLowerCase().includes("already has active shift")) {
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
      const payload = {
        latitude,
        longitude,
        created_at: new Date().toISOString(),
        client_id: `shift-end-${Date.now()}`,
      };
      await api.post(endpoints.patrols.endShift, payload);
      setActiveShift(false);
      saveOfflineShiftState({ active: false, endedAt: payload.created_at });
      setMessage("Shift ended successfully.");
      setMapCoordinates([]);
    } catch (endError) {
      if (!isOnline() || isNetworkError(endError)) {
        const payload = {
          latitude: null,
          longitude: null,
          created_at: new Date().toISOString(),
          client_id: `shift-end-${Date.now()}`,
        };
        enqueueOfflineAction({
          endpoint: endpoints.patrols.endShift,
          payload,
          category: "shift",
          type: "end",
          method: "post",
        });
        saveOfflineShiftState({ active: false, endedAt: payload.created_at });
        setActiveShift(false);
        setMessage("Offline: shift ended locally and queued for sync.");
        setMapCoordinates([]);
      } else {
        setError(endError?.response?.data?.error || endError.message || "Unable to end shift.");
      }
    } finally {
      setBusy(false);
    }
  };

  const sendSOS = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    triggerHaptic([200, 100, 200]);

    try {
      const { latitude, longitude } = await getLocation();
      const payload = {
        type: "other",
        description: "SOS alert activated from guard home page.",
        latitude,
        longitude,
        created_at: new Date().toISOString(),
        client_id: `incident-sos-${Date.now()}`,
      };
      await api.post(endpoints.patrols.incidents, payload);
      appendLocalRecord("incidents", { ...payload, pending: false });
      setMessage("SOS alert submitted to command.");
    } catch (sosError) {
      if (!isOnline() || isNetworkError(sosError)) {
        const payload = {
          type: "other",
          description: "SOS alert activated from guard home page.",
          latitude: null,
          longitude: null,
          created_at: new Date().toISOString(),
          client_id: `incident-sos-${Date.now()}`,
        };
        enqueueOfflineAction({
          endpoint: endpoints.patrols.incidents,
          payload,
          category: "incidents",
          type: "incident",
          method: "post",
        });
        appendLocalRecord("incidents", { ...payload, pending: true });
        setMessage("Offline: SOS alert queued locally for dispatch.");
      } else {
        setError(sosError?.response?.data?.error || sosError.message || "Unable to submit SOS alert.");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSosPressStart = (e) => {
    if (busy || !activeShift) return;
    e.preventDefault();
    triggerHaptic(30);

    if (sosTimerRef.current) clearTimeout(sosTimerRef.current);
    if (sosIntervalRef.current) clearInterval(sosIntervalRef.current);

    sosTimerRef.current = setTimeout(() => {
      clearInterval(sosIntervalRef.current);
      setSosProgress(100);
      sendSOS();
    }, 1500);

    sosIntervalRef.current = setInterval(() => {
      setSosProgress((prev) => Math.min(prev + (100 / 15), 100));
    }, 100);
  };

  const handleSosPressEnd = () => {
    if (sosTimerRef.current) clearTimeout(sosTimerRef.current);
    if (sosIntervalRef.current) clearInterval(sosIntervalRef.current);
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
        minHeight: "100vh",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
    >
      <style>{`
        .btn-tap-effect:active {
          transform: scale(0.97);
          transition: all .1s ease;
        }
        .sos-active-pulse {
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(220,38,38,0.4); }
          70% { box-shadow: 0 0 0 16px rgba(220,38,38,0); }
          100% { box-shadow: 0 0 0 0 rgba(220,38,38,0); }
        }
        .leaflet-container {
          width: 100%;
          height: 100%;
          border-radius: 1.25rem;
        }
      `}</style>

      <main
        style={{
          maxWidth: "480px",
          margin: "0 auto",
          padding: "1.25rem 1rem 2rem",
          display: "flex",
          flexDirection: "column",
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

        {/* Multi-Marker Monitoring Map Section */}
        <section 
          style={{ 
            height: "42vh", 
            width: "100%", 
            position: "relative",
            zIndex: 1,
            borderRadius: "1.25rem",
            boxShadow: "0 4px 20px rgba(15,23,42,0.08)",
            border: "1px solid #e2e8f0",
            background: "#cbd5e1"
          }}
        >
          {mapCoordinates.length > 0 ? (
            <MapContainer 
              center={[mapCoordinates[0].lat, mapCoordinates[0].lng]} 
              zoom={13} 
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Iterates through array of processed active shift entries */}
              {mapCoordinates.map((marker) => (
                <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={customIcon}>
                  <Popup>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#0f172a" }}>
                      {marker.label}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#64748b", gap: "0.5rem" }}>
              <FiMapPin size={24} />
              <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>Synchronizing live deployment map...</span>
            </div>
          )}
        </section>

        {/* Dynamic Centerpiece Overlay Trigger Controls */}
        <section
          style={{
            position: "relative",
            marginTop: "-6rem", 
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.25rem",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "10.5rem",
              height: "10.5rem",
              borderRadius: "50%",
              background: "#f8fafc", 
              padding: "4px",
              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Circular Progress Border */}
            <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", transform: "rotate(-90deg)" }} viewBox="0 0 180 180">
              <circle
                cx="90"
                cy="90"
                r={SVG_RADIUS}
                fill="transparent"
                stroke={activeShift ? "rgba(220,38,38,0.12)" : "#e2e8f0"}
                strokeWidth="6"
              />
              <circle
                cx="90"
                cy="90"
                r={SVG_RADIUS}
                fill="transparent"
                stroke="#dc2626"
                strokeWidth="6"
                strokeDasharray={SVG_CIRCUMFERENCE} 
                strokeDashoffset={SVG_CIRCUMFERENCE * (1 - sosProgress / 100)}
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
              onTouchCancel={handleSosPressEnd}
              disabled={busy || !activeShift}
              className={`btn-tap-effect ${activeShift && !busy ? "sos-active-pulse" : ""}`}
              style={{
                width: "8.75rem",
                height: "8.75rem",
                borderRadius: "50%",
                border: "none",
                background: busy || !activeShift ? "#cbd5e1" : "#dc2626",
                color: "#fff",
                cursor: busy || !activeShift ? "not-allowed" : "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: activeShift ? "0 12px 28px rgba(220,38,38,.3)" : "none",
                zIndex: 12,
              }}
            >
              <FiShield size={32} />
              <div style={{ marginTop: "0.25rem", fontSize: "1.75rem", fontWeight: 900, letterSpacing: ".02em" }}>
                {busy ? "..." : "SOS"}
              </div>
              <div style={{ fontSize: "0.55rem", opacity: 0.85, fontWeight: 700, marginTop: "0.15rem" }}>
                {activeShift ? "HOLD TO TRIGGER" : "SHIFT INACTIVE"}
              </div>
            </button>
          </div>

          {/* Feedback Messages */}
          {(error || message) && (
            <div style={{ width: "100%", zIndex: 11 }}>
              {error && (
                <div style={{ padding: "0.75rem", textAlign: "center", borderRadius: "0.75rem", background: "#fef2f2", color: "#dc2626", fontSize: "0.85rem", fontWeight: 500 }}>
                  {error}
                </div>
              )}
              {message && (
                <div style={{ padding: "0.75rem", textAlign: "center", borderRadius: "0.75rem", background: "#f0fdf4", color: "#16a34a", fontSize: "0.85rem", fontWeight: 500 }}>
                  {message}
                </div>
              )}
            </div>
          )}

          {/* Shift Activation Controls Box */}
          {!activeShift && (
            <div style={{ width: "100%", background: "#fff", borderRadius: "1rem", padding: "0.75rem", border: "1px solid #e2e8f0" }}>
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
            </div>
          )}
        </section>

        {/* Unified Operations Utility Actions Stack (Inline 2x2 Grid) */}
        <section style={{ marginTop: "0.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.65rem" }}>
            {QUICK_ACTIONS.map((item) => {
              const isDisabled = !activeShift && item.key !== "myShift";

              return (
                <button
                  key={item.key}
                  onClick={() => handleQuickAction(item.key)}
                  disabled={isDisabled}
                  className="btn-tap-effect"
                  style={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.75rem",
                    padding: "0.75rem 0.65rem",
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: "0.5rem",
                    boxShadow: "0 2px 6px rgba(15,23,42,.01)",
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    opacity: isDisabled ? 0.45 : 1,
                    width: "100%",
                    boxSizing: "border-box"
                  }}
                >
                  <div
                    style={{
                      width: "2rem",
                      height: "2rem",
                      borderRadius: "0.5rem",
                      background: `${item.color}12`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: item.color,
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </div>

                  <span
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: "#1e293b",
                      textAlign: "left",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
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