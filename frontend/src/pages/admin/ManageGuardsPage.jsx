import { useEffect, useState } from "react";
import { FiPlus, FiUser, FiMail, FiKey, FiShield } from "react-icons/fi";
import api from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import Modal from "../../components/common/Modal.jsx";

const initialForm = {
  email: "",
  first_name: "",
  last_name: "",
  password: "",
  role: "guard",
};

export default function ManageGuardsPage() {
  const [guards, setGuards] = useState([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);

  const loadGuards = async () => {
    try {
      const response = await api.get(endpoints.auth.users);
      setGuards(response.data.results || response.data);
      setError("");
    } catch {
      setError("Unable to retrieve operational personnel logs.");
    }
  };

  useEffect(() => {
    loadGuards();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus("");

    try {
      await api.post(endpoints.auth.users, form);
      setForm(initialForm);
      setShowModal(false);
      setStatus("Personnel account initialized successfully.");
      await loadGuards();
    } catch (requestError) {
      setStatus(requestError?.response?.data?.detail || "Failed to commit user credentials to registry.");
    } finally {
      setSaving(false);
    }
  };

  // Modern UI Shared Layout Token Variables
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

  // Security Role Color Token Configuration Matrix
  const getRoleBadgeStyles = (userRole) => {
    switch (userRole?.toLowerCase()) {
      case "admin":
        return { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" };
      case "supervisor":
        return { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" };
      case "guard":
      default:
        return { background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" };
    }
  };

  return (
    <section style={{ fontFamily: "system-ui, sans-serif", background: "#f8fafc", padding: "1.75rem", borderRadius: "0.75rem" }}>
      <article style={{ background: "#ffffff", borderRadius: "0.5rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.01)" }}>
        
        {/* Modern Header Row Panel matching brand layout */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap", gap: "1.25rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>Manage Guards</h2>
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.25rem", margin: 0 }}>Provision company access profiles, authorization metrics, and operation roles.</p>
          </div>
          <button 
            type="button" 
            onClick={() => setShowModal(true)}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1.125rem", background: "#00E699", color: "#091e14", border: "none", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: "700", cursor: "pointer", transition: "background 0.2s", boxShadow: "0 2px 4px rgba(0, 230, 153, 0.15)" }}
            onMouseOver={(e) => e.currentTarget.style.background = "#00cc85"}
            onMouseOut={(e) => e.currentTarget.style.background = "#00E699"}
          >
            <FiPlus size={16} style={{ strokeWidth: 3 }} />
            Add Guard
          </button>
        </div>

        {/* System Action Status Feedback Banners */}
        {error ? <div style={{ margin: "1rem 1.5rem 0 1.5rem", padding: "0.75rem 1rem", background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: "500" }}>{error}</div> : null}
        {status ? <div style={{ margin: "1rem 1.5rem 0 1.5rem", padding: "0.75rem 1rem", background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: "500" }}>{status}</div> : null}

        {/* Add Guard Form Overlay Modal Container */}
        {showModal ? (
          <Modal title="Onboard Operations Personnel" onClose={() => setShowModal(false)}>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "0.5rem" }}>
              
              <label style={labelStyles}>
                Account Email Address
                <input name="email" type="email" value={form.email} onChange={handleChange} required style={inputStyles} placeholder="name@company.com" />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label style={labelStyles}>
                  First Name
                  <input name="first_name" value={form.first_name} onChange={handleChange} style={inputStyles} placeholder="John" />
                </label>
                <label style={labelStyles}>
                  Last Name
                  <input name="last_name" value={form.last_name} onChange={handleChange} style={inputStyles} placeholder="Doe" />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label style={labelStyles}>
                  Secure Password
                  <input name="password" type="password" value={form.password} onChange={handleChange} required style={inputStyles} placeholder="••••••••" />
                </label>
                <label style={labelStyles}>
                  Clearance Role Assignment
                  <select name="role" value={form.role} onChange={handleChange} style={{ ...inputStyles, cursor: "pointer" }}>
                    <option value="guard">Guard (Field App Access)</option>
                    <option value="supervisor">Supervisor (Route Control)</option>
                    <option value="admin">Admin (Full Terminal Power)</option>
                  </select>
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
                  {saving ? "Generating Profile..." : "Initialize User"}
                </button>
              </div>
            </form>
          </Modal>
        ) : null}

        {/* Clean Structured Personnel Data Grid Interface */}
        {guards.length ? (
          <div style={{ width: "100%", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>User Identity Name</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>System Email Node</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Security Role Permissions</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status Hash</th>
                </tr>
              </thead>
              <tbody>
                {guards.map((guard) => {
                  const hasFullName = guard.first_name || guard.last_name;
                  return (
                    <tr 
                      key={guard.id} 
                      style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                      onMouseOver={(e) => e.currentTarget.style.background = "#fafbfd"}
                      onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "1rem 1.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyValue: "center", justifyContent: "center", border: "1px solid #e2e8f0", color: "#64748b" }}>
                            <FiUser size={14} />
                          </div>
                          <span style={{ fontSize: "0.875rem", fontWeight: "600", color: hasFullName ? "#0f172a" : "#94a3b8" }}>
                            {hasFullName ? `${guard.first_name || ""} ${guard.last_name || ""}`.trim() : "Unassigned Profile Name"}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: "1rem 1.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.875rem", color: "#475569" }}>
                          <FiMail style={{ color: "#94a3b8" }} size={13} />
                          <span>{guard.email}</span>
                        </div>
                      </td>

                      <td style={{ padding: "1rem 1.5rem" }}>
                        <span style={{ 
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          padding: "0.25rem 0.625rem", 
                          borderRadius: "0.25rem", 
                          fontSize: "0.75rem", 
                          fontWeight: "700", 
                          textTransform: "uppercase", 
                          letterSpacing: "0.03em",
                          ...getRoleBadgeStyles(guard.role) 
                        }}>
                          <FiShield size={11} />
                          {guard.role}
                        </span>
                      </td>

                      <td style={{ padding: "1rem 1.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                          <div style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", background: "#00E699" }} />
                          <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#475569", textTransform: "uppercase" }}>Active</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "5rem 2rem", background: "#ffffff" }}>
            <p style={{ fontSize: "1rem", fontWeight: "600", color: "#0f172a", margin: 0 }}>No active personnel localized</p>
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.35rem", margin: 0 }}>The security environment registry context currently lists zero provisioned user frames.</p>
          </div>
        )}
      </article>
    </section>
  );
}