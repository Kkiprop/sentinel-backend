import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FiActivity, 
  FiAlertTriangle, 
  FiCheckCircle, 
  FiMapPin, 
  FiClock, 
  FiFileText, 
  FiChevronRight,
  FiAlertCircle
} from "react-icons/fi";
import StatCard from "../../components/common/StatCard";
import api from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import {
  isOnline,
  isNetworkError,
  saveCachedDashboardMetrics,
  loadCachedDashboardMetrics,
} from "../../lib/offline.js";

export default function GuardDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(endpoints.patrols.dashboard)
      .then((response) => {
        setStats(response.data);
        saveCachedDashboardMetrics(response.data);
      })
      .catch(async () => {
        const cached = await loadCachedDashboardMetrics();
        if (cached) {
          setStats(cached);
          setError("Offline: showing cached dashboard metrics.");
        } else {
          setError("Unable to load live dashboard telemetry metrics.");
        }
      });
  }, []);

  const shiftCount = stats?.shift_count ?? stats?.total_patrol_logs ?? "—";
  const incidentCount = stats?.incident_count ?? stats?.incidents_count ?? stats?.total_incidents ?? "—";
  const checkpointCount = stats?.checkpoint_count ?? stats?.checkpoints_count ?? stats?.total_checkpoints ?? "—";

  const customStyles = `
    .action-row-card {
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .action-row-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04) !important;
    }
    .action-row-card:active {
      transform: translateY(0) scale(0.98);
      background-color: #f8fafc !important;
    }
    .active-pulse {
      animation: pulseAnimation 2s infinite;
    }
    @keyframes pulseAnimation {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5); }
      70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
    }
  `;

  return (
    <div style={{ 
      backgroundColor: "#f4f6f9", 
      minHeight: "100vh", 
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    }}>
      <style>{customStyles}</style>

      {/* Main View Shell Container Block */}
      <div style={{
        width: "100%",
        maxWidth: "480px",
        backgroundColor: "#ffffff",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 0 24px rgba(15, 23, 42, 0.02)",
        borderLeft: "1px solid #eef2f6",
        borderRight: "1px solid #eef2f6",
      }}>
        
        {/* Core Mobile Header Platform Layout */}
        <header style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          backgroundColor: "#ffffff",
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid #f1f5f9",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", backgroundColor: stats?.active_shift ? "#22c55e" : "#94a3b8" }} className={stats?.active_shift ? "active-pulse" : ""} />
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>Operations Room</h2>
          </div>
          <FiActivity size={18} color="#64748b" />
        </header>

        {/* Dashboard Main Scroll Area Workspace */}
        <main style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1rem", background: "#fef2f2", borderRadius: "0.75rem", border: "1px solid #fca5a5", color: "#991b1b", fontSize: "0.875rem", fontWeight: 600 }}>
              <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Identity Dashboard Hero Control Surface Card */}
          <section style={{ 
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", 
            borderRadius: "1.25rem", 
            padding: "1.5rem",
            color: "#ffffff",
            boxShadow: "0 12px 24px rgba(15, 23, 42, 0.12)",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem"
          }}>
            <div>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.075em" }}>FIELD CONTEXT</span>
              <h3 style={{ margin: "0.35rem 0 0 0", fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: "1.3" }}>Field Patrol Interface</h3>
              <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", color: "#94a3b8", lineHeight: "1.4" }}>Review active security checkpoints or capture immediate critical operational issues.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", borderTop: "1px solid #334155", paddingTop: "1.25rem" }}>
              <div>
                <span style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>SHIFT STATE</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.15rem" }}>
                  {stats?.active_shift ? <FiCheckCircle size={14} color="#22c55e" /> : <FiClock size={14} color="#94a3b8" />}
                  <strong style={{ fontSize: "1.05rem", fontWeight: 700, color: stats?.active_shift ? "#22c55e" : "#94a3b8" }}>
                    {stats?.active_shift ? "Active Duties" : "Off-Duty"}
                  </strong>
                </div>
              </div>
              <div>
                <span style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>LIVE WARNINGS</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.15rem" }}>
                  <FiAlertTriangle size={14} color={incidentCount > 0 ? "#ef4444" : "#94a3b8"} />
                  <strong style={{ fontSize: "1.05rem", fontWeight: 700, color: incidentCount > 0 ? "#ef4444" : "#ffffff" }}>
                    {incidentCount === "—" ? "—" : `${incidentCount} Events`}
                  </strong>
                </div>
              </div>
            </div>
          </section>

          {/* Metrics Visualization Cluster */}
          <section style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginLeft: "0.25rem" }}>Performance Indicators</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <StatCard
                label="Shift Status"
                value={stats?.active_shift ? "Active" : "Inactive"}
                tone={stats?.active_shift ? "success" : "warning"}
                icon={<FiClock />}
                meta="Current state"
              />
              <StatCard
                label="Total Shifts"
                value={shiftCount}
                icon={<FiFileText />}
                meta="Logged runs"
              />
              <StatCard
                label="Incidents"
                value={incidentCount}
                tone={incidentCount > 0 ? "danger" : "warning"}
                icon={<FiAlertTriangle />}
                meta="Filed reports"
              />
              <StatCard
                label="Checkpoints"
                value={checkpointCount}
                icon={<FiMapPin />}
                meta="Mapped nodes"
              />
            </div>
          </section>

          {/* Interactive Navigation Rows Group Panel */}
          <section style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginLeft: "0.25rem" }}>Core Controls</span>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              
              {/* Option Row 1: Shifts Navigation */}
              <div 
                onClick={() => navigate("/guard/shift")}
                className="action-row-card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1rem 1.25rem",
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "1rem",
                  cursor: "pointer",
                  boxShadow: "0 4px 6px rgba(15, 23, 42, 0.01)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "0.75rem", backgroundColor: "#eff6ff", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <FiClock size={18} color="#2563eb" />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>View Duty Shifts</h4>
                    <p style={{ margin: "0.15rem 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>Access shift roster and timeline logs</p>
                  </div>
                </div>
                <FiChevronRight size={18} color="#cbd5e1" />
              </div>

              {/* Option Row 2: Incidents Navigation */}
              <div 
                onClick={() => navigate("/guard/incidents")}
                className="action-row-card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1rem 1.25rem",
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "1rem",
                  cursor: "pointer",
                  boxShadow: "0 4px 6px rgba(15, 23, 42, 0.01)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "0.75rem", backgroundColor: "#fff7ed", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <FiAlertTriangle size={18} color="#ea580c" />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>My Incidents</h4>
                    <p style={{ margin: "0.15rem 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>Track and register security alert cases</p>
                  </div>
                </div>
                <FiChevronRight size={18} color="#cbd5e1" />
              </div>

              {/* Option Row 3: Checkpoints Navigation */}
              <div 
                onClick={() => navigate("/guard/checkpoints")}
                className="action-row-card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1rem 1.25rem",
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "1rem",
                  cursor: "pointer",
                  boxShadow: "0 4px 6px rgba(15, 23, 42, 0.01)",
                  marginBottom: "4rem"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "0.75rem", backgroundColor: "#f0fdf4", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <FiMapPin size={18} color="#16a34a" />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>My Checkpoints</h4>
                    <p style={{ margin: "0.15rem 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>Track real-time hardware tracking points</p>
                  </div>
                </div>
                <FiChevronRight size={18} color="#cbd5e1" />
              </div>

            </div>
          </section>

        </main>
      </div>
    </div>
  );
}