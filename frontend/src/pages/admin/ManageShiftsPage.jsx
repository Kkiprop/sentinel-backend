import { useEffect, useState } from "react";
import { FiPlus, FiCalendar, FiClock, FiUser, FiShield, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import api from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import Modal from "../../components/common/Modal.jsx";

const initialForm = {
  guard: "",
  site: "",
  start_time: "",
  end_time: "",
  status: "active",
};

export default function ManageShiftsPage() {
  const [shifts, setShifts] = useState([]);
  const [guards, setGuards] = useState([]);
  const [sites, setSites] = useState([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);

  // Client-side Pagination State parameters
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadData = async () => {
    try {
      const [shiftResponse, guardResponse, siteResponse] = await Promise.all([
        api.get(endpoints.patrols.adminShifts),
        api.get(endpoints.auth.users),
        api.get(endpoints.patrols.sites),
      ]);
      const shiftItems = shiftResponse.data.results || shiftResponse.data;
      const guardItems = (guardResponse.data.results || guardResponse.data).filter((user) => user.role === "guard");
      const siteItems = siteResponse.data.results || siteResponse.data;
      
      setShifts(shiftItems);
      setGuards(guardItems);
      setSites(siteItems);
      
      setForm((prev) => ({
        ...prev,
        guard: prev.guard || (guardItems[0] ? String(guardItems[0].id) : ""),
        site: prev.site || (siteItems[0] ? String(siteItems[0].id) : ""),
      }));
      setError("");
    } catch {
      setError("Unable to retrieve tactical shift logs.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute pagination index limits
  const totalPages = Math.ceil(shifts.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentShifts = shifts.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus("");

    try {
      await api.post(endpoints.patrols.adminShifts, {
        guard: Number(form.guard),
        site: Number(form.site),
        start_time: form.start_time,
        end_time: form.end_time || null,
        status: form.status,
        start_latitude: null,
        start_longitude: null,
        end_latitude: null,
        end_longitude: null,
      });
      setForm((prev) => ({ ...initialForm, guard: prev.guard, site: prev.site }));
      setShowModal(false);
      setStatus("Guard operational shift scheduled successfully.");
      setCurrentPage(1); // Reset back to baseline primary page upon deployment insertion
      await loadData();
    } catch (requestError) {
      setStatus(requestError?.response?.data?.detail || "Failed to commit shift structure updates.");
    } finally {
      setSaving(false);
    }
  };

  // Modern UI Consistent Layout Design System Objects
  const inputStyles = {
    width: "100%",
    padding: "0.625rem 0.875rem",
    borderRadius: "0.375rem",
    border: "1px solid #cbd5e1",
    fontSize: "0.875rem",
    color: "#0f172a",
    background: "#ffffff",
    outline: "none",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.02)",
    transition: "border-color 0.15s ease",
  };

  const labelStyles = {
    display: "flex",
    flexDirection: "column",
    gap: "0.375rem",
    fontSize: "0.875rem",
    fontWeight: "600",
    color: "#334155",
  };

  const paginationButtonStyles = (disabled) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "2.25rem",
    height: "2.25rem",
    borderRadius: "0.375rem",
    border: "1px solid #e2e8f0",
    backgroundColor: disabled ? "#f8fafc" : "#ffffff",
    color: disabled ? "#cbd5e1" : "#475569",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.15s ease",
  });

  const getStatusBadgeStyles = (shiftStatus) => {
    switch (shiftStatus?.toLowerCase()) {
      case "active":
        return { background: "#e6fdf5", color: "#047857", border: "1px solid #a7f3d0" };
      case "completed":
        return { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" };
      case "missed":
        return { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fca5a5" };
      default:
        return { background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" };
    }
  };

  const formatTimestamp = (dateTimeStr) => {
    if (!dateTimeStr) return "--:--";
    return dateTimeStr.replace("T", " ");
  };

  return (
    <section style={{ fontFamily: "system-ui, sans-serif", background: "#f8fafc", padding: "1.75rem", borderRadius: "0.75rem" }}>
      <article style={{ background: "#ffffff", borderRadius: "0.5rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.01)" }}>
        
        {/* Core Shift Control Panel Header Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap", gap: "1.25rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>Manage Shifts</h2>
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.25rem", margin: 0 }}>Deploy roster profiles, timeline constraints, and tracking fields for active patrol routes.</p>
          </div>
          
          <button 
            type="button" 
            onClick={() => setShowModal(true)}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1.125rem", background: "#00E699", color: "#091e14", border: "none", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: "700", cursor: "pointer", transition: "background 0.2s", boxShadow: "0 2px 4px rgba(0, 230, 153, 0.15)" }}
            onMouseOver={(e) => e.currentTarget.style.background = "#00cc85"}
            onMouseOut={(e) => e.currentTarget.style.background = "#00E699"}
          >
            <FiPlus size={16} style={{ strokeWidth: 3 }} />
            Add Shift
          </button>
        </div>

        {error ? <div style={{ margin: "1rem 1.5rem 0 1.5rem", padding: "0.75rem 1rem", background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: "500" }}>{error}</div> : null}
        {status ? <div style={{ margin: "1rem 1.5rem 0 1.5rem", padding: "0.75rem 1rem", background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: "500" }}>{status}</div> : null}

        {/* Add Shift Overlay Dialog Modal Form */}
        {showModal ? (
          <Modal title="Deploy New Guard Shift" onClose={() => setShowModal(false)}>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "0.5rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label style={labelStyles}>
                  Assigned Guard Personnel
                  <select name="guard" value={form.guard} onChange={handleChange} required style={{ ...inputStyles, cursor: "pointer" }}>
                    <option value="">Select identity email...</option>
                    {guards.map((guard) => (
                      <option key={guard.id} value={guard.id}>{guard.email}</option>
                    ))}
                  </select>
                </label>

                <label style={labelStyles}>
                  Target Security Site Sector
                  <select name="site" value={form.site} onChange={handleChange} required style={{ ...inputStyles, cursor: "pointer" }}>
                    <option value="">Select target sector...</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label style={labelStyles}>
                  Shift Activation Time (Start)
                  <input name="start_time" type="datetime-local" value={form.start_time} onChange={handleChange} required style={inputStyles} />
                </label>

                <label style={labelStyles}>
                  Shift Termination Time (End)
                  <input name="end_time" type="datetime-local" value={form.end_time} onChange={handleChange} style={inputStyles} />
                </label>
              </div>

              <label style={labelStyles}>
                Operational Deployment Status
                <select name="status" value={form.status} onChange={handleChange} style={{ ...inputStyles, cursor: "pointer" }}>
                  <option value="active">Active (On Duty Tracking)</option>
                  <option value="completed">Completed (Archived Closed)</option>
                  <option value="missed">Missed (Unattended Warning)</option>
                </select>
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.75rem", borderTop: "1px solid #f1f5f9", paddingTop: "1.25rem" }}>
                <button 
                  type="submit" 
                  disabled={saving}
                  style={{ padding: "0.625rem 1.5rem", background: "#00E699", color: "#091e14", border: "none", borderRadius: "0.375rem", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" }}
                  onMouseOver={(e) => e.currentTarget.style.background = "#00cc85"}
                  onMouseOut={(e) => e.currentTarget.style.background = "#00E699"}
                >
                  {saving ? "Scheduling Deployment..." : "Authorize Roster Shift"}
                </button>
              </div>
            </form>
          </Modal>
        ) : null}

        {/* Clean Structured Shift Registry Grid Table View Layout */}
        {shifts.length ? (
          <>
            <div style={{ width: "100%", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Shift Registry Index</th>
                    <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Assigned Guard Personnel</th>
                    <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Target Operational Sector</th>
                    <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Timeline Parameters</th>
                    <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Operational Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentShifts.map((shift) => (
                    <tr 
                      key={shift.id} 
                      style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                      onMouseOver={(e) => e.currentTarget.style.background = "#fafbfd"}
                      onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "1rem 1.5rem", fontSize: "0.875rem", fontFamily: "monospace", color: "#64748b", fontWeight: "600" }}>
                        #{shift.id}
                      </td>
                      
                      <td style={{ padding: "1rem 1.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <FiUser size={14} style={{ color: "#94a3b8" }} />
                          <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "#0f172a" }}>
                            {shift.guard_email || `User Key ID Reference: ${shift.guard}`}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: "1rem 1.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <FiShield size={14} style={{ color: "#94a3b8" }} />
                          <span style={{ fontSize: "0.875rem", color: "#334155", fontWeight: "500" }}>
                            {shift.site_name || `Sector Core: ${shift.site}`}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: "1rem 1.5rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.75rem", color: "#475569", fontFamily: "monospace" }}>
                            <FiCalendar size={12} style={{ color: "#94a3b8" }} />
                            <span>ON: {formatTimestamp(shift.start_time)}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.75rem", color: "#64748b", fontFamily: "monospace" }}>
                            <FiClock size={12} style={{ color: "#94a3b8" }} />
                            <span>OFF: {formatTimestamp(shift.end_time)}</span>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "1rem 1.5rem" }}>
                        <span style={{ 
                          display: "inline-block", 
                          padding: "0.25rem 0.625rem", 
                          borderRadius: "0.25rem", 
                          fontSize: "0.75rem", 
                          fontWeight: "700", 
                          textTransform: "uppercase", 
                          letterSpacing: "0.02em",
                          ...getStatusBadgeStyles(shift.status) 
                        }}>
                          {shift.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer Menu Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem", borderTop: "1px solid #f1f5f9", background: "#ffffff" }}>
              <span style={{ fontSize: "0.875rem", color: "#64748b" }}>
                Showing <strong>{indexOfFirstItem + 1}</strong> to <strong>{Math.min(indexOfLastItem, shifts.length)}</strong> of <strong>{shifts.length}</strong> active registry records
              </span>
              
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button 
                  onClick={() => handlePageChange(currentPage - 1)} 
                  disabled={currentPage === 1}
                  style={paginationButtonStyles(currentPage === 1)}
                  onMouseOver={(e) => currentPage !== 1 && (e.currentTarget.style.borderColor = "#cbd5e1")}
                  onMouseOut={(e) => currentPage !== 1 && (e.currentTarget.style.borderColor = "#e2e8f0")}
                >
                  <FiChevronLeft size={16} />
                </button>
                
                <span style={{ fontSize: "0.875rem", color: "#0f172a", fontWeight: "600", padding: "0 0.5rem" }}>
                  Page {currentPage} of {totalPages}
                </span>

                <button 
                  onClick={() => handlePageChange(currentPage + 1)} 
                  disabled={currentPage === totalPages}
                  style={paginationButtonStyles(currentPage === totalPages)}
                  onMouseOver={(e) => currentPage !== totalPages && (e.currentTarget.style.borderColor = "#cbd5e1")}
                  onMouseOut={(e) => currentPage !== totalPages && (e.currentTarget.style.borderColor = "#e2e8f0")}
                >
                  <FiChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "5rem 2rem", background: "#ffffff" }}>
            <p style={{ fontSize: "1rem", fontWeight: "600", color: "#0f172a", margin: 0 }}>No shift assets deployed</p>
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.35rem", margin: 0 }}>The structural log system currently registers zero guard scheduling frames matching this instance pool.</p>
          </div>
        )}
      </article>
    </section>
  );
}