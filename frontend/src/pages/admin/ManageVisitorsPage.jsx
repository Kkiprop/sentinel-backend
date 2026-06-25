import { useEffect, useState } from "react";
import { FiPlus, FiUser, FiMail, FiPhone, FiBriefcase, FiClock } from "react-icons/fi";
import api from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import {
  appendLocalRecord,
  enqueueOfflineAction,
  loadLocalRecords,
  saveCachedSites,
  isOnline,
  isNetworkError,
} from "../../lib/offline.js";
import Modal from "../../components/common/Modal.jsx";

const nowLocalValue = () => {
  const now = new Date();
  const tzOffsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now - tzOffsetMs).toISOString().slice(0, 16);
};

const initialForm = {
  first_name: "",
  last_name: "",
  phone_number: "",
  email: "",
  department: "",
  check_in: nowLocalValue(),
  check_out: "",
};

export default function ManageVisitorsPage() {
  const [visitors, setVisitors] = useState([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);

  const loadVisitors = async () => {
    try {
      const response = await api.get(endpoints.patrols.adminVisitors);
      const payload = response.data.results || response.data;
      setVisitors(payload);
      setError("");
      payload.forEach((visitor) => {
        appendLocalRecord("visitors", { ...visitor, pending: false });
      });
    } catch {
      const cachedVisitors = loadLocalRecords("visitors") || [];
      if (cachedVisitors.length) {
        setVisitors(cachedVisitors);
        setError("Offline: showing locally stored visitor logs.");
      } else {
        setError("Unable to retrieve visitor records.");
      }
    }
  };

  useEffect(() => {
    loadVisitors();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus("");

    const payload = { ...form };
    if (!payload.email) {
      delete payload.email;
    }
    if (!payload.check_out) {
      delete payload.check_out;
    }

    try {
      await api.post(endpoints.patrols.adminVisitors, payload);
      setForm(initialForm);
      setShowModal(false);
      setStatus("Visitor record created successfully.");
      appendLocalRecord("visitors", { ...payload, pending: false, check_in: payload.check_in });
      await loadVisitors();
    } catch (requestError) {
      if (!isOnline() || isNetworkError(requestError)) {
        const offlinePayload = { ...payload, client_id: `visitor-${Date.now()}` };
        enqueueOfflineAction({
          endpoint: endpoints.patrols.adminVisitors,
          payload: offlinePayload,
          category: "visitors",
          type: "visitor",
          method: "post",
        });
        appendLocalRecord("visitors", { ...offlinePayload, pending: true });
        setForm(initialForm);
        setShowModal(false);
        setStatus("Offline: visitor record queued locally.");
      } else {
        const message = requestError?.response?.data?.detail || requestError?.response?.data || "Failed to save visitor details.";
        setStatus(typeof message === "string" ? message : JSON.stringify(message));
      }
    } finally {
      setSaving(false);
    }
  };

  const formatTimestamp = (iso) => {
    if (!iso) return "—";
    const date = new Date(iso);
    return date.toLocaleString();
  };

  const checkoutVisitor = async (visitorId) => {
    setSaving(true);
    setStatus("");

    try {
      const payload = { check_out: new Date().toISOString() };
      await api.patch(`${endpoints.patrols.adminVisitors}${visitorId}/`, payload);
      setStatus("Visitor checked out successfully.");
      await loadVisitors();
    } catch (requestError) {
      if (!isOnline() || isNetworkError(requestError)) {
        const offlinePayload = { check_out: new Date().toISOString(), client_id: `visitor-checkout-${visitorId}-${Date.now()}` };
        enqueueOfflineAction({
          endpoint: `${endpoints.patrols.adminVisitors}${visitorId}/`,
          payload: offlinePayload,
          category: "visitors",
          type: "visitor-checkout",
          method: "patch",
        });
        setStatus("Offline: checkout queued locally and will sync when online.");
      } else {
        const message = requestError?.response?.data?.detail || requestError?.response?.data || "Failed to check out visitor.";
        setStatus(typeof message === "string" ? message : JSON.stringify(message));
      }
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <section style={{ fontFamily: "system-ui, sans-serif", background: "#f8fafc", padding: "1.75rem", borderRadius: "0.75rem" }}>
      <article style={{ background: "#ffffff", borderRadius: "0.5rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.01)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap", gap: "1.25rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>Visitor Management</h2>
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.25rem", margin: 0 }}>Track visitors with name, contact, department, and check-in/check-out details.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1.125rem", background: "#00E699", color: "#091e14", border: "none", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: "700", cursor: "pointer", transition: "background 0.2s", boxShadow: "0 2px 4px rgba(0, 230, 153, 0.15)" }}
            onMouseOver={(e) => e.currentTarget.style.background = "#00cc85"}
            onMouseOut={(e) => e.currentTarget.style.background = "#00E699"}
          >
            <FiPlus size={16} style={{ strokeWidth: 3 }} />
            Add Visitor
          </button>
        </div>

        {error ? <div style={{ margin: "1rem 1.5rem 0 1.5rem", padding: "0.75rem 1rem", background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: "500" }}>{error}</div> : null}
        {status ? <div style={{ margin: "1rem 1.5rem 0 1.5rem", padding: "0.75rem 1rem", background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: "500" }}>{status}</div> : null}

        {showModal ? (
          <Modal title="Log Visitor" onClose={() => setShowModal(false)}>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "0.5rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label style={labelStyles}>
                  First Name
                  <input name="first_name" value={form.first_name} onChange={handleChange} required style={inputStyles} placeholder="Alex" />
                </label>
                <label style={labelStyles}>
                  Last Name
                  <input name="last_name" value={form.last_name} onChange={handleChange} required style={inputStyles} placeholder="Visitor" />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label style={labelStyles}>
                  Phone Number
                  <input name="phone_number" value={form.phone_number} onChange={handleChange} required style={inputStyles} placeholder="(555) 123-4567" />
                </label>
                <label style={labelStyles}>
                  Email (optional)
                  <input name="email" type="email" value={form.email} onChange={handleChange} style={inputStyles} placeholder="visitor@company.com" />
                </label>
              </div>

              <label style={labelStyles}>
                Department Visiting
                <input name="department" value={form.department} onChange={handleChange} required style={inputStyles} placeholder="Facilities, HR, Security" />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label style={labelStyles}>
                  Check-in
                  <input name="check_in" type="datetime-local" value={form.check_in} onChange={handleChange} required style={inputStyles} />
                </label>
                <label style={labelStyles}>
                  Check-out (optional)
                  <input name="check_out" type="datetime-local" value={form.check_out} onChange={handleChange} style={inputStyles} />
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.75rem", borderTop: "1px solid #f1f5f9", paddingTop: "1.25rem" }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: "0.625rem 1.5rem", background: "#00E699", color: "#091e14", border: "none", borderRadius: "0.375rem", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" }}
                  onMouseOver={(e) => e.currentTarget.style.background = "#00cc85"}
                  onMouseOut={(e) => e.currentTarget.style.background = "#00E699"}
                >
                  {saving ? "Saving Visitor..." : "Save Visitor"}
                </button>
              </div>
            </form>
          </Modal>
        ) : null}

        {visitors.length ? (
          <div style={{ width: "100%", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Name</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Phone</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Department</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Check-in</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Check-out</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map((visitor) => {
                  const displayName = `${visitor.first_name || ""} ${visitor.last_name || ""}`.trim() || "Visitor";

                  return (
                    <tr
                      key={visitor.id}
                      style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                      onMouseOver={(e) => e.currentTarget.style.background = "#fafbfd"}
                      onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "1rem 1.5rem", fontSize: "0.875rem", fontWeight: "600", color: "#0f172a" }}>{displayName}</td>
                      <td style={{ padding: "1rem 1.5rem", color: "#475569", fontSize: "0.875rem" }}>{visitor.phone_number}</td>
                      <td style={{ padding: "1rem 1.5rem", color: "#475569", fontSize: "0.875rem" }}>{visitor.email || "—"}</td>
                      <td style={{ padding: "1rem 1.5rem", color: "#475569", fontSize: "0.875rem" }}>{visitor.department}</td>
                      <td style={{ padding: "1rem 1.5rem", fontSize: "0.875rem", color: "#64748b" }}>{formatTimestamp(visitor.check_in)}</td>
                      <td style={{ padding: "1rem 1.5rem", fontSize: "0.875rem", color: "#64748b" }}>{formatTimestamp(visitor.check_out)}</td>
                      <td style={{ padding: "1rem 1.5rem" }}>
                        {visitor.check_out ? (
                          <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748b" }}>Checked out</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => checkoutVisitor(visitor.id)}
                            disabled={saving}
                            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.5rem 0.85rem", background: "#fcd34d", color: "#92400e", border: "none", borderRadius: "0.375rem", fontSize: "0.775rem", fontWeight: "700", cursor: "pointer" }}
                            onMouseOver={(e) => e.currentTarget.style.background = "#fbbf24"}
                            onMouseOut={(e) => e.currentTarget.style.background = "#fcd34d"}
                          >
                            <FiClock size={14} />
                            Checkout
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "5rem 2rem", background: "#ffffff" }}>
            <p style={{ fontSize: "1rem", fontWeight: "600", color: "#0f172a", margin: 0 }}>No visitors registered yet</p>
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.35rem", margin: 0 }}>Use the form above to add a visitor and log their check-in information.</p>
          </div>
        )}
      </article>
    </section>
  );
}
