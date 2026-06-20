import { useEffect, useState } from "react";
import { FiAlertTriangle, FiShield, FiUser, FiCalendar, FiActivity, FiX, FiMapPin, FiPaperclip, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import api from "../../lib/api";
import { endpoints } from "../../lib/endpoints";

export default function ManageIncidentsPage() {
  const [incidents, setIncidents] = useState([]);
  const [error, setError] = useState("");
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Change this value to adjust the page limit

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
    return { background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a" };
  };

  const formatTimestamp = (dateTimeStr) => {
    if (!dateTimeStr) return "Just Now";
    return dateTimeStr.replace("T", " ").substring(0, 16);
  };

  // Pagination Computations
  const totalPages = Math.ceil(incidents.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentIncidents = incidents.slice(indexOfFirstItem, indexOfLastItem);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  return (
    /* The outermost section matches your layout's original design but calculates an analytical 
      height constraint (calc(100vh - 120px)) based on typical navbar dimensions, locking scroll rules.
    */
    <section style={{ fontFamily: "system-ui, sans-serif", background: "#f8fafc", padding: "1.75rem", borderRadius: "0.75rem", height: "calc(100vh - 140px)", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
      <article style={{ background: "#ffffff", borderRadius: "0.5rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.01)", display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
        
        {/* Core Administrative Command Header Panel */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem", borderBottom: "1px solid #f1f5f9", flexShrink: 0, flexWrap: "wrap", gap: "1rem" }}>
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
          <div style={{ margin: "1rem 1.5rem", padding: "0.75rem 1rem", background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: "500", flexShrink: 0 }}>
            {error}
          </div>
        ) : null}

        {/* Clean Structured Exception Grid Layout Table Wrapper */}
        {incidents.length ? (
          <div style={{ width: "100%", flex: 1, overflowY: "auto", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "#f8fafc" }}>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Classification / Type</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Incident Site Sector</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Reporting Field Officer</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Timestamp Filed</th>
                </tr>
              </thead>
              <tbody>
                {currentIncidents.map((incident) => (
                  <tr 
                    key={incident.id} 
                    style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s", cursor: "pointer" }}
                    onClick={() => setSelectedIncident(incident)}
                    onMouseOver={(e) => e.currentTarget.style.background = "#fafbfd"}
                    onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                  >
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

                    <td style={{ padding: "1rem 1.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <FiShield size={14} style={{ color: "#94a3b8" }} />
                        <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "#0f172a" }}>
                          {incident.site_name || `Sector Context Reference #${incident.site}`}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: "1rem 1.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <FiUser size={14} style={{ color: "#94a3b8" }} />
                        <span style={{ fontSize: "0.875rem", color: "#334155", fontWeight: "500" }}>
                          {incident.guard_name || `Staff ID: ${incident.guard}`}
                        </span>
                      </div>
                    </td>

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
          <div style={{ textAlign: "center", padding: "5rem 2rem", background: "#ffffff", flex: 1 }}>
            <div style={{ width: "3.5rem", height: "3.5rem", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#00cc85", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem auto" }}>
              <FiShield size={24} />
            </div>
            <p style={{ fontSize: "1rem", fontWeight: "600", color: "#0f172a", margin: 0 }}>Secure Perimeter Integrity</p>
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.35rem", margin: 0 }}>
              The system currently reads clean. No anomalous exception signals or incident flags have been recorded.
            </p>
          </div>
        ) : null}

        {/* Unified Administrative Pagination Control Bar */}
        {incidents.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem", borderTop: "1px solid #f1f5f9", background: "#ffffff", flexShrink: 0 }}>
            <div style={{ fontSize: "0.875rem", color: "#64748b" }}>
              Showing <strong style={{ color: "#0f172a" }}>{indexOfFirstItem + 1}</strong> to <strong style={{ color: "#0f172a" }}>{Math.min(indexOfLastItem, incidents.length)}</strong> of <strong style={{ color: "#0f172a" }}>{incidents.length}</strong> records
            </div>
            <div style={{ display: "flex", itemsCenter: "center", gap: "0.5rem" }}>
              <button 
                onClick={handlePrevPage} 
                disabled={currentPage === 1}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.5rem 0.75rem", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: "600", color: currentPage === 1 ? "#cbd5e1" : "#334155", cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
              >
                <FiChevronLeft size={16} /> Previous
              </button>
              <button 
                onClick={handleNextPage} 
                disabled={currentPage === totalPages}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.5rem 0.75rem", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: "600", color: currentPage === totalPages ? "#cbd5e1" : "#334155", cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
              >
                Next <FiChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </article>

      {/* Detail Overlay Modal */}
      {selectedIncident && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 50, padding: "1rem" }}>
          <div style={{ background: "#ffffff", borderRadius: "0.75rem", border: "1px solid #e2e8f0", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", maxWidth: "32rem", width: "100%", overflow: "hidden" }}>
            
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ display: "inline-flex", alignItems: "center", padding: "0.25rem 0.625rem", borderRadius: "0.25rem", fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", ...getSeverityStyles(selectedIncident.type) }}>
                  {selectedIncident.type || "Anomaly"}
                </span>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontFamily: "monospace" }}>#{selectedIncident.client_id || selectedIncident.id}</span>
              </div>
              <button onClick={() => setSelectedIncident(null)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "0.25rem", display: "flex", alignItems: "center" }}>
                <FiX size={18} />
              </button>
            </div>

            {/* Modal Contents */}
            <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem", maxHeight: "65vh", overflowY: "auto" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.35rem" }}>Description</label>
                <p style={{ fontSize: "0.95rem", color: "#334155", margin: 0, padding: "0.875rem", background: "#f8fafc", borderRadius: "0.5rem", border: "1px solid #f1f5f9", lineHeight: "1.5" }}>
                  {selectedIncident.description || "No description logged for this exception report."}
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "0.25rem" }}>Location Site</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.875rem", fontWeight: "600", color: "#0f172a" }}>
                    <FiShield size={14} style={{ color: "#94a3b8" }} />
                    <span>{selectedIncident.site_name}</span>
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "0.25rem" }}>Reporting Officer</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.875rem", color: "#334155" }}>
                    <FiUser size={14} style={{ color: "#94a3b8" }} />
                    <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{selectedIncident.guard_name}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", borderTop: "1px solid #f1f5f9", paddingTop: "1.25rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "0.25rem" }}>Telemetry Coordinates</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.875rem", fontFamily: "monospace", color: "#64748b" }}>
                    <FiMapPin size={14} style={{ color: "#94a3b8" }} />
                    <span>{selectedIncident.latitude}, {selectedIncident.longitude}</span>
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "0.25rem" }}>Shift State</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "#334155", textTransform: "capitalize" }}>
                    <span style={{ display: "inline-block", width: "0.5rem", height: "0.5rem", borderRadius: "50%", background: selectedIncident.shift_status === "active" ? "#22c55e" : "#94a3b8" }} />
                    <span>{selectedIncident.shift_status}</span>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "0.5rem" }}>Evidence Attachments</label>
                {selectedIncident.image || selectedIncident.attachment || selectedIncident.video || selectedIncident.audio ? (
                  <div>
                    {selectedIncident.image && (
                      <img src={selectedIncident.image} alt="Incident File" style={{ width: "100%", maxHeight: "12rem", objectFit: "cover", borderRadius: "0.375rem" }} />
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.75rem", color: "#94a3b8", background: "#f8fafc", padding: "0.75rem", borderRadius: "0.375rem", border: "1px dashed #e2e8f0" }}>
                    <FiPaperclip size={14} />
                    <span>No external image, audio, or log telemetry files attached.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Action Footer */}
            <div style={{ background: "#f8fafc", padding: "1rem 1.5rem", display: "flex", justifyContent: "flex-end", borderTop: "1px solid #f1f5f9" }}>
              <button 
                onClick={() => setSelectedIncident(null)} 
                style={{ padding: "0.5rem 1rem", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "0.5rem", fontSize: "0.875rem", fontWeight: "600", color: "#334155", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
              >
                Dismiss Audit
              </button>
            </div>

          </div>
        </div>
      )}
    </section>
  );
}