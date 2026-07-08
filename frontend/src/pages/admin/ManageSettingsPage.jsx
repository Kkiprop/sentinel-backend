import { useEffect, useState, useCallback } from "react";
import { FiSettings, FiSave, FiAlertCircle, FiRefreshCw, FiCheck, FiX, FiHome, FiCreditCard, FiCalendar, FiDollarSign } from "react-icons/fi";
import api from "../../lib/api";
import { endpoints } from "../../lib/endpoints";

const TABS = [
  { key: "profile", label: "Company Profile", icon: <FiHome size={16} /> },
  { key: "subscription", label: "Subscription & Billing", icon: <FiCreditCard size={16} /> },
];

export default function ManageSettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [company, setCompany] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [formData, setFormData] = useState({});
  const [subFormData, setSubFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [profileRes, subRes] = await Promise.all([
        api.get(endpoints.auth.profile),
        api.get(endpoints.auth.subscription),
      ]);
      setCompany(profileRes.data);
      setFormData(profileRes.data);
      setSubscription(subRes.data);
      if (subRes.data) {
        // Format dates for display
        setSubFormData({
          ...subRes.data,
          start_date: subRes.data.start_date || "",
          end_date: subRes.data.end_date || "",
        });
      } else {
        setSubFormData({
          plan: "monthly",
          status: "trial",
          amount: "",
          start_date: new Date().toISOString().split("T")[0],
          end_date: "",
          auto_renew: true,
          payment_method: "",
          payment_reference: "",
          notes: "",
        });
      }
    } catch {
      setError("Unable to load settings data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSubFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.patch(endpoints.auth.profile, formData);
      setCompany(response.data);
      setSuccess("Company profile updated successfully.");
    } catch (err) {
      const msg = err?.response?.data ? Object.values(err.response.data).flat().join(", ") : "Failed to update profile";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSubscription = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        plan: subFormData.plan,
        status: subFormData.status,
        amount: subFormData.amount,
        start_date: subFormData.start_date,
        end_date: subFormData.end_date || null,
        auto_renew: subFormData.auto_renew,
        payment_method: subFormData.payment_method,
        payment_reference: subFormData.payment_reference,
        notes: subFormData.notes,
      };
      const response = await api.post(endpoints.auth.subscription, payload);
      setSubscription(response.data);
      setSuccess("Subscription saved successfully.");
    } catch (err) {
      const msg = err?.response?.data ? Object.values(err.response.data).flat().join(", ") : "Failed to save subscription";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" });
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "—";
    return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2 }).format(amount);
  };

  const statusColors = {
    trial: { bg: "#fef3c7", color: "#92400e" },
    active: { bg: "#d1fae5", color: "#065f46" },
    expired: { bg: "#fef2f2", color: "#991b1b" },
    cancelled: { bg: "#f3f4f6", color: "#6b7280" },
    suspended: { bg: "#fce7f3", color: "#9d174d" },
  };

  if (loading && !company) {
    return (
      <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280", fontFamily: "system-ui, sans-serif" }}>
        Loading settings...
      </div>
    );
  }

  return (
    <section className="panel-grid single admin-stack" style={{ fontFamily: "system-ui, sans-serif" }}>
      <article className="panel" style={{ border: "none", boxShadow: "none", background: "transparent" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#111827", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <FiSettings /> Settings
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: "0.25rem 0 0 0" }}>Manage your security agency profile and subscription</p>
          </div>
          <button onClick={fetchData} style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 1rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500, color: "#374151" }}>
            <FiRefreshCw size={14} /> Refresh
          </button>
        </div>

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1rem", background: "#fef2f2", borderRadius: "0.5rem", border: "1px solid #fca5a5", color: "#991b1b", fontSize: "0.85rem", marginBottom: "1rem" }}>
            <FiAlertCircle size={16} /> {error}
          </div>
        )}

        {success && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1rem", background: "#f0fdf4", borderRadius: "0.5rem", border: "1px solid #86efac", color: "#166534", fontSize: "0.85rem", marginBottom: "1rem" }}>
            <FiCheck size={16} /> {success}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.25rem", borderBottom: "2px solid #e5e7eb" }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setError(""); setSuccess(""); }}
              style={{
                display: "flex", alignItems: "center", gap: "0.375rem",
                padding: "0.65rem 1.25rem",
                border: "none",
                borderBottom: activeTab === tab.key ? "2px solid #2563eb" : "2px solid transparent",
                marginBottom: "-2px",
                background: activeTab === tab.key ? "#eff6ff" : "transparent",
                color: activeTab === tab.key ? "#2563eb" : "#6b7280",
                fontWeight: activeTab === tab.key ? 600 : 500,
                fontSize: "0.85rem",
                cursor: "pointer",
                borderRadius: "0.375rem 0.375rem 0 0",
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && company && (
          <div style={{ background: "#fff", borderRadius: "0.5rem", border: "1px solid #e5e7eb", padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#111827", margin: "0 0 0.25rem 0" }}>{company.name}</h3>
            <p style={{ fontSize: "0.8rem", color: "#6b7280", margin: "0 0 1.25rem 0" }}>Member since {formatDate(company.created_at)}</p>

            <form onSubmit={handleSaveProfile}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div className="field-group">
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Company Name *</label>
                  <input name="name" value={formData.name || ""} onChange={handleInputChange} required style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }} />
                </div>
                <div className="field-group">
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Email</label>
                  <input name="email" type="email" value={formData.email || ""} onChange={handleInputChange} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div className="field-group">
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Phone</label>
                  <input name="phone" value={formData.phone || ""} onChange={handleInputChange} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }} />
                </div>
                <div className="field-group">
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Website</label>
                  <input name="website" value={formData.website || ""} onChange={handleInputChange} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }} />
                </div>
              </div>

              <div className="field-group" style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Address</label>
                <textarea name="address" value={formData.address || ""} onChange={handleInputChange} rows={2} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem", resize: "vertical" }} />
              </div>

              <div className="field-group" style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Description</label>
                <textarea name="description" value={formData.description || ""} onChange={handleInputChange} rows={3} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem", resize: "vertical" }} placeholder="Brief description of your security agency..." />
              </div>

              <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" disabled={saving} style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 1.5rem", borderRadius: "0.375rem", border: "none", background: saving ? "#93c5fd" : "#2563eb", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
                  <FiSave size={16} /> {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Subscription Tab */}
        {activeTab === "subscription" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Current subscription status card */}
            {subscription && (
              <div style={{ background: "#fff", borderRadius: "0.5rem", border: "1px solid #e5e7eb", padding: "1.25rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#111827", margin: "0 0 0.75rem 0" }}>Current Subscription</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
                  <div>
                    <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: "0.15rem" }}>Plan</div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#111827", textTransform: "capitalize" }}>{subscription.plan}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: "0.15rem" }}>Status</div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, padding: "2px 8px", borderRadius: "999px", background: (statusColors[subscription.status] || { bg: "#f3f4f6", color: "#4b5563" }).bg, color: (statusColors[subscription.status] || { bg: "#f3f4f6", color: "#4b5563" }).color, textTransform: "capitalize" }}>
                      {subscription.status}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: "0.15rem" }}>Amount</div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#111827" }}>{formatCurrency(subscription.amount)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: "0.15rem" }}>Period</div>
                    <div style={{ fontSize: "0.85rem", color: "#374151" }}>{formatDate(subscription.start_date)} — {formatDate(subscription.end_date)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: "0.15rem" }}>Auto-Renew</div>
                    <div style={{ fontSize: "0.85rem", color: "#374151" }}>{subscription.auto_renew ? "Yes" : "No"}</div>
                  </div>
                  {subscription.payment_method && (
                    <div>
                      <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: "0.15rem" }}>Payment Method</div>
                      <div style={{ fontSize: "0.85rem", color: "#374151" }}>{subscription.payment_method}</div>
                    </div>
                  )}
                </div>
                {subscription.notes && (
                  <div style={{ marginTop: "0.75rem", padding: "0.5rem", background: "#f9fafb", borderRadius: "0.375rem", fontSize: "0.8rem", color: "#6b7280" }}>
                    <strong>Notes:</strong> {subscription.notes}
                  </div>
                )}
              </div>
            )}

            {/* No subscription message */}
            {!subscription && (
              <div style={{ background: "#fff", borderRadius: "0.5rem", border: "1px solid #e5e7eb", padding: "1.25rem", textAlign: "center" }}>
                <FiCreditCard size={32} style={{ color: "#9ca3af", marginBottom: "0.5rem" }} />
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#111827", margin: "0 0 0.25rem 0" }}>No Subscription Yet</h3>
                <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: 0 }}>Set up your subscription below to get started.</p>
              </div>
            )}

            {/* Edit/Create subscription form */}
            <div style={{ background: "#fff", borderRadius: "0.5rem", border: "1px solid #e5e7eb", padding: "1.5rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#111827", margin: "0 0 1rem 0" }}>
                {subscription ? "Update Subscription" : "Create Subscription"}
              </h3>
              <form onSubmit={handleSaveSubscription}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div className="field-group">
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Plan *</label>
                    <select name="plan" value={subFormData.plan || "monthly"} onChange={handleSubInputChange} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }}>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="biannual">Bi-Annual</option>
                      <option value="annual">Annual</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div className="field-group">
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Status</label>
                    <select name="status" value={subFormData.status || "trial"} onChange={handleSubInputChange} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }}>
                      <option value="trial">Trial</option>
                      <option value="active">Active</option>
                      <option value="expired">Expired</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                  <div className="field-group">
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Amount</label>
                    <input name="amount" type="number" step="0.01" value={subFormData.amount || ""} onChange={handleSubInputChange} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div className="field-group">
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Start Date</label>
                    <input name="start_date" type="date" value={subFormData.start_date || ""} onChange={handleSubInputChange} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }} />
                  </div>
                  <div className="field-group">
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>End Date</label>
                    <input name="end_date" type="date" value={subFormData.end_date || ""} onChange={handleSubInputChange} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div className="field-group">
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Payment Method</label>
                    <input name="payment_method" value={subFormData.payment_method || ""} onChange={handleSubInputChange} placeholder="e.g. M-Pesa, Bank Transfer" style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }} />
                  </div>
                  <div className="field-group">
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Payment Reference</label>
                    <input name="payment_reference" value={subFormData.payment_reference || ""} onChange={handleSubInputChange} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }} />
                  </div>
                </div>

                <div className="field-group" style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: 600, color: "#374151", cursor: "pointer" }}>
                    <input name="auto_renew" type="checkbox" checked={subFormData.auto_renew || false} onChange={handleSubInputChange} style={{ width: "1rem", height: "1rem" }} />
                    Auto-renew subscription
                  </label>
                </div>

                <div className="field-group" style={{ marginBottom: "1.25rem" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Notes</label>
                  <textarea name="notes" value={subFormData.notes || ""} onChange={handleSubInputChange} rows={2} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem", resize: "vertical" }} />
                </div>

                <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
                  <button type="submit" disabled={saving} style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 1.5rem", borderRadius: "0.375rem", border: "none", background: saving ? "#93c5fd" : "#2563eb", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
                    <FiSave size={16} /> {saving ? "Saving..." : subscription ? "Update Subscription" : "Create Subscription"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </article>
    </section>
  );
}