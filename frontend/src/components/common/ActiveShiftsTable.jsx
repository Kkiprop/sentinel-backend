import { useEffect, useState } from "react";
import { FiUsers, FiActivity } from "react-icons/fi";
import api from "../../lib/api";

export default function ActiveShiftsTable() {
  const [activeShifts, setActiveShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/api/auth/users/"),
      api.get("/api/patrols/manage/shifts/"),
      api.get("/api/patrols/sites/")
    ])
      .then(([usersRes, shiftsRes, sitesRes]) => {
        const users = usersRes.data || [];
        const shifts = shiftsRes.data || [];
        const sites = sitesRes.data || [];

        const liveShifts = shifts.filter((shift) => shift.status === "active");

        const mergedData = liveShifts.map((shift) => {
          const guardMatch = users.find((u) => u.id === shift.guard);
          let guardName = "Unknown Guard";
          if (guardMatch) {
            guardName = guardMatch.first_name || guardMatch.last_name
              ? `${guardMatch.first_name} ${guardMatch.last_name}`.trim()
              : guardMatch.email;
          }

          const siteMatch = sites.find((s) => s.id === shift.site);
          const siteName = siteMatch ? siteMatch.name : `Site ID: ${shift.site}`;

          return {
            id: shift.id,
            guardName,
            siteName,
            startTime: shift.start_time,
          };
        });

        setActiveShifts(mergedData);
      })
      .catch((err) => {
        console.error("Relational data join exception:", err);
        setError("Unable to load active deployment profiles.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const formatTime = (isoString) => {
    if (!isoString) return "—";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + 
           " (" + date.toLocaleDateString() + ")";
  };

  if (loading) {
    return (
      <article style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box", background: "var(--panel)", borderRadius: "0.9rem", border: "1px solid var(--border)", padding: "3rem 2rem", textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
        <p style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text)", margin: 0 }}>Syncing active roster profiles...</p>
      </article>
    );
  }

  return (
    <article style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box", fontFamily: "system-ui, sans-serif", background: "var(--panel)", borderRadius: "0.9rem", border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      
      {/* Header Container Wrapper matching HR Page styling */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FiActivity /> Live Guard Deployments
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.25rem", margin: 0 }}>Personnel currently clocked into operational job sites.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#475569", fontSize: "0.875rem", fontWeight: "600" }}>
          <FiUsers /> {activeShifts.length} personnel active
        </div>
      </div>

      {error ? (
        <div style={{ margin: "1rem 1.5rem", padding: "0.75rem 1rem", background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5", borderRadius: "0.375rem", fontSize: "0.875rem" }}>
          {error}
        </div>
      ) : null}

      {activeShifts.length ? (
        <div style={{ width: "100%", overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Guard Name</th>
                <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Assigned Site</th>
                <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Shift Started At</th>
                <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", textRight: "right" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {activeShifts.map((row) => (
                <tr 
                  key={row.id} 
                  style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                  onMouseOver={(e) => e.currentTarget.style.background = "#fafbfd"}
                  onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "1rem 1.5rem", fontSize: "0.875rem", fontWeight: "500", color: "#0f172a" }}>
                    {row.guardName}
                  </td>
                  <td style={{ padding: "1rem 1.5rem", fontSize: "0.875rem", color: "#334155" }}>
                    {row.siteName}
                  </td>
                  <td style={{ padding: "1rem 1.5rem", fontSize: "0.875rem", color: "#475569" }}>
                    {formatTime(row.startTime)}
                  </td>
                  <td style={{ padding: "1rem 1.5rem" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.35rem 0.65rem", background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: "0.375rem", fontSize: "0.75rem", fontWeight: "700" }}>
                      <span style={{ width: "6px", height: "6px", background: "#22c55e", borderRadius: "50%" }} />
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "5rem 2rem", background: "#ffffff" }}>
          <p style={{ fontSize: "1rem", fontWeight: "600", color: "#0f172a", margin: 0 }}>No active shifts found</p>
          <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.35rem", margin: 0 }}>Personnel currently working active site rotations will pop up here.</p>
        </div>
      )}
    </article>
  );
}