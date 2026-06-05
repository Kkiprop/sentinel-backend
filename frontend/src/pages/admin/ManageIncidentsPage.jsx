import { useEffect, useState } from "react";
import { FiAlertTriangle, FiShield, FiUser, FiCalendar, FiActivity } from "react-icons/fi";
import api from "../../lib/api";
import { endpoints } from "../../lib/endpoints";

export default function ManageIncidentsPage() {
  const [incidents, setIncidents] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(endpoints.patrols.incidents)
      .then((response) => setIncidents(response.data.results || response.data))
      .catch(() => setError("Unable to load incident feed data from the registry."));
  }, []);

  // Tactical Threat Assessment Token Categorizer Matrix
  const getSeverityStyles = (incidentType) => {
    const criticalKeywords = ["fire", "breach", "theft", "assault", "trespass", "damage", "intrusion"];
    const typeLower = incidentType?.toLowerCase() || "";
    
    const isCritical = criticalKeywords.some(keyword => typeLower.includes(keyword));

    if (isCritical) {
      return { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fca5a5" };
    }
    // Standard Advisory / Observational Incidents
    return { background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a" };
  };

  const formatTimestamp = (dateTimeStr) => {
    if (!dateTimeStr) return "Just Now";
    return dateTimeStr.replace("T", " ").substring(0, 16);
  };

  return (
    <section style={{ fontFamily: "system-ui, sans-serif", background: "#f8fafc", padding: "1.75rem", borderRadius: "0.75rem" }}>
      <article style={{ background: "#ffffff", borderRadius: "0.5rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.01)" }}>
        
        {/* Core Administrative Command Header Panel */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <FiActivity style={{ color: "#00E699" }} />
              Incident Command Terminal
            </h2>
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.25rem", margin: 0 }}>Review, audit, and analyze exception reports filed by deployed monitoring personnel.</p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#14532d", padding: "0.375rem 0.75rem", borderRadius: "2rem", fontSize: "0.875rem", fontWeight: "600" }}>
            <span style={{ color: "#166534" }}>Active Log Entries:</span>
            <strong style={{ fontSize: "0.95rem" }}>{incidents.length}</strong>
          </div>
        </div>

        {/* Live System Feedback Banner Trays */}
        {error ? (
          <div style={{ margin: "1rem 1.5rem", padding: "0.75rem 1rem", background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: "500" }}>
            {error}
          </div>
        ) : null}

        {/* Clean Structured Exception Grid Layout Table */}
        {incidents.length ? (
          <div style={{ width: "100%", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Classification / Type</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Incident Site Sector</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Reporting Field Officer</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Timestamp Filed</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => (
                  <tr 
                    key={incident.id} 
                    style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                    onMouseOver={(e) => e.currentTarget.style.background = "#fafbfd"}
                    onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    {/* Severity Classified Incident Identifier */}
                    <td style={{ padding: "1rem 1.5rem" }}>
                      <span style={{ 
                        display: "inline-flex", 
                        alignItems: "center", 
                        gap: "0.375rem", 
                        padding: "0.35rem 0.75rem", 
                        borderRadius: "0.25rem", 
                        fontSize: "0.75rem", 
                        fontWeight: "700", 
                        textTransform: "uppercase", 
                        letterSpacing: "0.03em",
                        ...getSeverityStyles(incident.type)
                      }}>
                        <FiAlertTriangle size={12} />
                        {incident.type || "Undefined Anomaly"}
                      </span>
                    </td>

                    {/* Site Boundary Tracking Cell */}
                    <td style={{ padding: "1rem 1.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <FiShield size={14} style={{ color: "#94a3b8" }} />
                        <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "#0f172a" }}>
                          {incident.site_name || `Sector Context Reference #${incident.site}`}
                        </span>
                      </div>
                    </td>

                    {/* Reporting Guard Tracking Profile */}
                    <td style={{ padding: "1rem 1.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <FiUser size={14} style={{ color: "#94a3b8" }} />
                        <span style={{ fontSize: "0.875rem", color: "#334155", fontWeight: "500" }}>
                          {incident.guard_name || `Staff ID: ${incident.guard}`}
                        </span>
                      </div>
                    </td>

                    {/* Operational Logging Timestamp */}
                    <td style={{ padding: "1rem 1.5rem", fontSize: "0.875rem", fontFamily: "monospace", color: "#64748b" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                        <FiCalendar size={12} style={{ color: "#cbd5e1" }} />
                        <span>{formatTimestamp(incident.created_at || incident.timestamp)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !error ? (
          /* Empty Pipeline Diagnostic Slate Layout */
          <div style={{ textAlign: "center", padding: "5rem 2rem", background: "#ffffff" }}>
            <div style={{ width: "3.5rem", height: "3.5rem", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#00cc85", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem auto" }}>
              <FiShield size={24} />
            </div>
            <p style={{ fontSize: "1rem", fontWeight: "600", color: "#0f172a", margin: 0 }}>Secure Perimeter Integrity</p>
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.35rem", margin: 0 }}>
              The system currently reads clean. No anomalous exception signals or incident flags have been recorded.
            </p>
          </div>
        ) : null}
      </article>
    </section>
  );
}