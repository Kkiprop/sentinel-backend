import { useEffect, useState } from "react";
import { FiEdit3, FiUsers, FiShield } from "react-icons/fi";
import api from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import Modal from "../../components/common/Modal.jsx";

const initialForm = {
  payroll_code: "",
  off_days: 0,
  qualifications: "",
  date_joined: "",
};

export default function ManageHRPage() {
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState(initialForm);

  const loadEmployees = async () => {
    try {
      const response = await api.get(endpoints.auth.users);
      const data = response.data.results || response.data;
      setEmployees(data.filter((user) => ["guard", "supervisor"].includes(user.role)));
      setError("");
    } catch {
      setError("Unable to load HR records.");
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const openEdit = (user) => {
    setSelectedUser(user);
    setForm({
      payroll_code: user.payroll_code || "",
      off_days: user.off_days ?? 0,
      qualifications: user.qualifications || "",
      date_joined: user.date_joined ? user.date_joined.substring(0, 10) : "",
    });
    setStatus("");
    setShowModal(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: name === "off_days" ? Number(value) : value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!selectedUser) return;

    setSaving(true);
    setStatus("");

    try {
      await api.patch(`${endpoints.auth.users}${selectedUser.id}/`, {
        payroll_code: form.payroll_code || null,
        off_days: form.off_days,
        qualifications: form.qualifications || null,
        date_joined: form.date_joined || null,
      });
      setStatus("HR profile updated.");
      setShowModal(false);
      setSelectedUser(null);
      await loadEmployees();
    } catch (requestError) {
      const message = requestError?.response?.data?.detail || requestError?.response?.data || "Failed to save HR changes.";
      setStatus(typeof message === "string" ? message : JSON.stringify(message));
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
  };

  return (
    <section style={{ fontFamily: "system-ui, sans-serif", background: "#f8fafc", padding: "1.75rem", borderRadius: "0.75rem" }}>
      <article style={{ background: "#ffffff", borderRadius: "0.5rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.01)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <FiShield /> HR Management
            </h2>
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.25rem", margin: 0 }}>Manage guard and supervisor HR details, payroll codes, leave data, and qualifications.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#475569", fontSize: "0.875rem", fontWeight: "600" }}>
            <FiUsers /> {employees.length} employee records
          </div>
        </div>

        {error ? <div style={{ margin: "1rem 1.5rem", padding: "0.75rem 1rem", background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5", borderRadius: "0.375rem", fontSize: "0.875rem" }}>{error}</div> : null}
        {status ? <div style={{ margin: "1rem 1.5rem", padding: "0.75rem 1rem", background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: "0.375rem", fontSize: "0.875rem" }}>{status}</div> : null}

        {employees.length ? (
          <div style={{ width: "100%", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Name</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Role</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Joined</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Payroll</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Off days</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Qualifications</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((user) => (
                  <tr key={user.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }} onMouseOver={(e) => e.currentTarget.style.background = "#fafbfd"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "1rem 1.5rem" }}>{`${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email}</td>
                    <td style={{ padding: "1rem 1.5rem", textTransform: "capitalize" }}>{user.role}</td>
                    <td style={{ padding: "1rem 1.5rem" }}>{formatDate(user.date_joined)}</td>
                    <td style={{ padding: "1rem 1.5rem" }}>{user.payroll_code || "—"}</td>
                    <td style={{ padding: "1rem 1.5rem" }}>{user.off_days ?? 0}</td>
                    <td style={{ padding: "1rem 1.5rem", maxWidth: "18rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.qualifications || "—"}</td>
                    <td style={{ padding: "1rem 1.5rem" }}>
                      <button
                        type="button"
                        onClick={() => openEdit(user)}
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.5rem 0.85rem", background: "#e0f2fe", color: "#0369a1", border: "none", borderRadius: "0.375rem", fontSize: "0.775rem", fontWeight: "700", cursor: "pointer" }}
                      >
                        <FiEdit3 size={14} />
                        Edit HR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "5rem 2rem", background: "#ffffff" }}>
            <p style={{ fontSize: "1rem", fontWeight: "600", color: "#0f172a", margin: 0 }}>No HR records found</p>
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.35rem", margin: 0 }}>Guard and supervisor HR details appear here for review and updates.</p>
          </div>
        )}
      </article>

      {showModal && (
        <Modal title="Update HR Profile" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "0.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.875rem", fontWeight: "600", color: "#334155" }}>
                Date Joined
                <input name="date_joined" type="date" value={form.date_joined} onChange={handleChange} style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "0.375rem", border: "1px solid #cbd5e1" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.875rem", fontWeight: "600", color: "#334155" }}>
                Payroll Code
                <input name="payroll_code" value={form.payroll_code} onChange={handleChange} style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "0.375rem", border: "1px solid #cbd5e1" }} />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.875rem", fontWeight: "600", color: "#334155" }}>
                Off Days
                <input name="off_days" type="number" min="0" value={form.off_days} onChange={handleChange} style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "0.375rem", border: "1px solid #cbd5e1" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.875rem", fontWeight: "600", color: "#334155" }}>
                Qualifications
                <input name="qualifications" value={form.qualifications} onChange={handleChange} style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "0.375rem", border: "1px solid #cbd5e1" }} />
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "0.5rem" }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ padding: "0.65rem 1.25rem", background: "#e2e8f0", color: "#475569", border: "none", borderRadius: "0.375rem", fontWeight: "700", cursor: "pointer" }}>
                Cancel
              </button>
              <button type="submit" disabled={saving} style={{ padding: "0.65rem 1.25rem", background: "#0ea5e9", color: "#ffffff", border: "none", borderRadius: "0.375rem", fontWeight: "700", cursor: "pointer" }}>
                {saving ? "Saving..." : "Save HR"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
