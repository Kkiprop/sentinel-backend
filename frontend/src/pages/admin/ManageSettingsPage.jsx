import { useEffect, useState, useCallback } from "react";
import { FiSettings, FiSave, FiAlertCircle, FiRefreshCw, FiCheck, FiHome, FiCreditCard, FiCalendar, FiDollarSign, FiX, FiTrendingUp, FiShield, FiUsers, FiMapPin, FiTarget, FiBarChart2, FiDownload, FiStar, FiClock, FiPlus, FiMinus } from "react-icons/fi";
import api from "../../lib/api";
import { endpoints } from "../../lib/endpoints";

const TABS = [
  { key: "profile", label: "Company Profile", icon: <FiHome size={16} /> },
  { key: "subscription", label: "Plans & Billing", icon: <FiCreditCard size={16} /> },
  { key: "history", label: "Billing History", icon: <FiClock size={16} /> },
];

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return "—";
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2 }).format(amount);
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" });
};

const statusColors = {
  trial: { bg: "#fef3c7", color: "#92400e" },
  active: { bg: "#d1fae5", color: "#065f46" },
  expired: { bg: "#fef2f2", color: "#991b1b" },
  cancelled: { bg: "#f3f4f6", color: "#6b7280" },
  suspended: { bg: "#fce7f3", color: "#9d174d" },
};

const planTierColors = {
  free: "#6b7280",
  starter: "#3b82f6",
  professional: "#8b5cf6",
  enterprise: "#f59e0b",
};

export default function ManageSettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [company, setCompany] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Subscription state
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [billingPlans, setBillingPlans] = useState([]);
  const [billingHistory, setBillingHistory] = useState({ payments: [], invoices: [] });
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [selectedCycle, setSelectedCycle] = useState("monthly");
  const [subscribing, setSubscribing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [profileRes, subRes, plansRes, historyRes] = await Promise.all([
        api.get(endpoints.auth.profile),
        api.get(endpoints.auth.subscription),
        api.get(endpoints.auth.billingPlans),
        api.get(endpoints.auth.billingHistory),
      ]);
      setCompany(profileRes.data);
      setFormData(profileRes.data);
      setSubscriptionData(subRes.data);
      setBillingPlans(plansRes.data.results || plansRes.data || []);
      setBillingHistory(historyRes.data);
    } catch {
      setError("Unable to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = { ...formData };
      delete payload.logo;
      const response = await api.patch(endpoints.auth.profile, payload);
      setCompany(response.data);
      setSuccess("Company profile updated successfully.");
    } catch (err) {
      const msg = err?.response?.data ? Object.values(err.response.data).flat().join(", ") : "Failed to update profile";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleStartTrial = async () => {
    setSubscribing(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.post(endpoints.auth.subscribe, {});
      setSubscriptionData(prev => ({ ...prev, active_subscription: response.data }));
      setSuccess("Trial started successfully! You have 14 days to explore.");
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to start trial");
    } finally {
      setSubscribing(false);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPlanId) {
      setError("Please select a plan");
      return;
    }
    setSubscribing(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.post(endpoints.auth.subscribe, {
        plan_id: selectedPlanId,
        billing_cycle: selectedCycle,
        payment_method: "Manual",
        payment_reference: `SUB-${Date.now()}`,
      });
      setSubscriptionData(prev => ({ ...prev, active_subscription: response.data }));
      setSuccess("Subscription activated successfully!");
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to subscribe");
    } finally {
      setSubscribing(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel your subscription? You will lose access at the end of the billing period.")) return;
    setError("");
    setSuccess("");
    try {
      await api.post(endpoints.auth.cancelSubscription);
      setSuccess("Subscription cancelled successfully.");
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to cancel");
    }
  };

  const activeSub = subscriptionData?.active_subscription;
  const access = subscriptionData?.access || {};
  const isTrialing = activeSub?.status === "trial";
  const isActive = activeSub?.status === "active";

  if (loading && !company) {
    return <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280", fontFamily: "system-ui, sans-serif" }}>Loading...</div>;
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

        {/* Subscription status banner */}
        {activeSub && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", borderRadius: "0.5rem", marginBottom: "1rem", background: isTrialing ? "#fef3c7" : isActive ? "#d1fae5" : "#f3f4f6", border: `1px solid ${isTrialing ? "#f59e0b" : isActive ? "#86efac" : "#e5e7eb"}` }}>
            <FiStar size={20} style={{ color: isTrialing ? "#92400e" : isActive ? "#065f46" : "#6b7280" }} />
            <div style={{ fontSize: "0.85rem", color: isTrialing ? "#92400e" : isActive ? "#065f46" : "#6b7280", flex: 1 }}>
              {isTrialing && <strong>Trial Mode:</strong>}
              {isActive && <strong>Active Plan:</strong>}
              {!isTrialing && !isActive && <strong>Status: {activeSub.status}</strong>}
              {" "}{activeSub.plan_name} · {activeSub.billing_cycle} · KES {Number(activeSub.amount).toLocaleString()}
              {activeSub.days_remaining !== null && activeSub.days_remaining !== undefined && (
                <span> · <strong>{activeSub.days_remaining} days remaining</strong></span>
              )}
            </div>
          </div>
        )}

        {/* Trial expired banner */}
        {access?.status === "trial_expired" && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", borderRadius: "0.5rem", marginBottom: "1rem", background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", fontSize: "0.85rem" }}>
            <FiAlertCircle size={20} />
            <span><strong>Trial Expired.</strong> {access.reason}</span>
          </div>
        )}

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
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setError(""); setSuccess(""); }}
              style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.65rem 1.25rem", border: "none", borderBottom: activeTab === tab.key ? "2px solid #2563eb" : "2px solid transparent", marginBottom: "-2px", background: activeTab === tab.key ? "#eff6ff" : "transparent", color: activeTab === tab.key ? "#2563eb" : "#6b7280", fontWeight: activeTab === tab.key ? 600 : 500, fontSize: "0.85rem", cursor: "pointer", borderRadius: "0.375rem 0.375rem 0 0" }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ======================== PROFILE TAB ======================== */}
        {activeTab === "profile" && company && (
          <div style={{ background: "#fff", borderRadius: "0.5rem", border: "1px solid #e5e7eb", padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#111827", margin: "0 0 0.25rem 0" }}>{company.name}</h3>
            <p style={{ fontSize: "0.8rem", color: "#6b7280", margin: "0 0 1.25rem 0" }}>Member since {formatDate(company.created_at)}</p>
            <form onSubmit={handleSaveProfile}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div><label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Company Name *</label>
                  <input name="name" value={formData.name || ""} onChange={handleInputChange} required style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }} /></div>
                <div><label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Email</label>
                  <input name="email" type="email" value={formData.email || ""} onChange={handleInputChange} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div><label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Phone</label>
                  <input name="phone" value={formData.phone || ""} onChange={handleInputChange} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }} /></div>
                <div><label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Website</label>
                  <input name="website" value={formData.website || ""} onChange={handleInputChange} placeholder="example.com or https://example.com" style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }} /></div>
              </div>
              <div style={{ marginBottom: "1rem" }}><label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Address</label>
                <textarea name="address" value={formData.address || ""} onChange={handleInputChange} rows={2} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem", resize: "vertical" }} /></div>
              <div style={{ marginBottom: "1.25rem" }}><label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Description</label>
                <textarea name="description" value={formData.description || ""} onChange={handleInputChange} rows={3} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem", resize: "vertical" }} placeholder="Brief description of your security agency..." /></div>
              <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" disabled={saving} style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 1.5rem", borderRadius: "0.375rem", border: "none", background: saving ? "#93c5fd" : "#2563eb", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
                  <FiSave size={16} /> {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ======================== PLANS & BILLING TAB ======================== */}
        {activeTab === "subscription" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Current subscription card */}
            {activeSub ? (
              <div style={{ background: "#fff", borderRadius: "0.5rem", border: "1px solid #e5e7eb", padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#111827", margin: 0 }}>Current Plan</h3>
                  {isActive && <button onClick={handleCancel} style={{ padding: "0.375rem 0.75rem", borderRadius: "0.375rem", border: "1px solid #dc2626", background: "#fff", color: "#dc2626", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}>Cancel</button>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
                  <div><div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Plan</div>
                    <div style={{ fontWeight: 700, color: "#111827", textTransform: "capitalize" }}>{activeSub.plan_name || "N/A"}</div></div>
                  <div><div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Status</div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, padding: "2px 8px", borderRadius: "999px", background: (statusColors[activeSub.status] || {}).bg || "#f3f4f6", color: (statusColors[activeSub.status] || {}).color || "#4b5563", textTransform: "capitalize" }}>{activeSub.status}</span></div>
                  <div><div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Billing Cycle</div>
                    <div style={{ textTransform: "capitalize" }}>{activeSub.billing_cycle}</div></div>
                  <div><div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Amount</div>
                    <div style={{ fontWeight: 700 }}>{formatCurrency(activeSub.amount)}</div></div>
                  <div><div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Period</div>
                    <div style={{ fontSize: "0.8rem" }}>{formatDate(activeSub.start_date)} — {formatDate(activeSub.end_date)}</div></div>
                  <div><div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Days Left</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: activeSub.days_remaining && activeSub.days_remaining <= 3 ? "#dc2626" : "#059669" }}>{activeSub.days_remaining ?? "—"}</div></div>
                </div>
              </div>
            ) : (
              <div style={{ background: "#fff", borderRadius: "0.5rem", border: "1px solid #e5e7eb", padding: "1.5rem", textAlign: "center" }}>
                <FiCreditCard size={32} style={{ color: "#9ca3af", marginBottom: "0.5rem" }} />
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#111827", margin: "0 0 0.25rem 0" }}>No Active Subscription</h3>
                <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: "0 0 1rem 0" }}>Start a free trial or choose a plan below.</p>
                <button onClick={handleStartTrial} disabled={subscribing} style={{ padding: "0.5rem 1.5rem", borderRadius: "0.375rem", border: "none", background: "#f59e0b", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}>{subscribing ? "Starting..." : "Start 14-Day Free Trial"}</button>
              </div>
            )}

            {/* Available Plans */}
            <div style={{ background: "#fff", borderRadius: "0.5rem", border: "1px solid #e5e7eb", padding: "1.25rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#111827", margin: "0 0 1rem 0" }}>Available Plans</h3>
              {billingPlans.length === 0 ? (
                <p style={{ color: "#6b7280", textAlign: "center", padding: "1rem" }}>No plans available yet.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
                  {billingPlans.map((plan) => {
                    const isSelected = selectedPlanId === plan.id;
                    return (
                      <div key={plan.id} onClick={() => setSelectedPlanId(plan.id)}
                        style={{ border: isSelected ? "2px solid #2563eb" : "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "1rem", cursor: "pointer", background: isSelected ? "#eff6ff" : "#fff", transition: "all 0.15s", position: "relative" }}>
                        {isSelected && <div style={{ position: "absolute", top: "-1px", right: "-1px", background: "#2563eb", color: "#fff", fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: "0 0.5rem 0 0.5rem" }}>SELECTED</div>}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                          <span style={{ fontWeight: 700, color: "#111827", fontSize: "1rem" }}>{plan.name}</span>
                          <span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "2px 6px", borderRadius: "4px", background: planTierColors[plan.tier] || "#6b7280", color: "#fff", textTransform: "uppercase" }}>{plan.tier}</span>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.75rem", minHeight: "2.5rem" }}>{plan.description || `${plan.name} plan features`}</div>
                        <div style={{ display: "flex", gap: "0.25rem", fontSize: "0.75rem", color: "#374151", marginBottom: "0.75rem" }}>
                          <div style={{ flex: 1, textAlign: "center", padding: "0.25rem", background: "#f9fafb", borderRadius: "0.25rem" }}><FiUsers size={12} /><br />{plan.max_guards || "∞"} Guards</div>
                          <div style={{ flex: 1, textAlign: "center", padding: "0.25rem", background: "#f9fafb", borderRadius: "0.25rem" }}><FiMapPin size={12} /><br />{plan.max_sites || "∞"} Sites</div>
                          <div style={{ flex: 1, textAlign: "center", padding: "0.25rem", background: "#f9fafb", borderRadius: "0.25rem" }}><FiTarget size={12} /><br />{plan.max_checkpoints || "∞"} Ckpts</div>
                        </div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#111827", marginBottom: "0.5rem" }}>{formatCurrency(plan.monthly_price)}<span style={{ fontWeight: 400, color: "#6b7280", fontSize: "0.75rem" }}>/mo</span></div>
                        {/* Feature list */}
                        <div style={{ fontSize: "0.75rem", color: "#374151" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", marginBottom: "0.15rem" }}><FiCheck size={12} style={{ color: "#059669" }} /> Analytics: {plan.has_analytics ? "✓" : "✗"}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", marginBottom: "0.15rem" }}><FiCheck size={12} style={{ color: "#059669" }} /> Reports: {plan.has_reports ? "✓" : "✗"}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", marginBottom: "0.15rem" }}><FiCheck size={12} style={{ color: "#059669" }} /> API Access: {plan.has_api_access ? "✓" : "✗"}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><FiCheck size={12} style={{ color: "#059669" }} /> Priority Support: {plan.has_priority_support ? "✓" : "✗"}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Cycle selector + subscribe button */}
              {selectedPlanId && (
                <div style={{ marginTop: "1.25rem", padding: "1rem", background: "#f9fafb", borderRadius: "0.5rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", marginBottom: "0.25rem" }}>Billing Cycle</label>
                    <select value={selectedCycle} onChange={(e) => setSelectedCycle(e.target.value)} style={{ padding: "0.375rem 0.75rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }}>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="biannual">Bi-Annual</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6b7280" }}>Price</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#111827" }}>
                      {billingPlans.find(p => p.id === selectedPlanId) ? formatCurrency(billingPlans.find(p => p.id === selectedPlanId)[`${selectedCycle}_price`] || 0) : "—"}
                    </div>
                  </div>
                  <button onClick={handleSubscribe} disabled={subscribing} style={{ padding: "0.625rem 1.5rem", borderRadius: "0.375rem", border: "none", background: subscribing ? "#93c5fd" : "#2563eb", color: "#fff", fontWeight: 600, cursor: subscribing ? "not-allowed" : "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                    <FiCreditCard size={16} /> {subscribing ? "Processing..." : "Subscribe Now"}
                  </button>
                </div>
              )}

              {/* Subscription History */}
              {subscriptionData?.subscription_history?.length > 0 && (
                <details style={{ marginTop: "1rem" }}>
                  <summary style={{ fontSize: "0.8rem", fontWeight: 600, color: "#6b7280", cursor: "pointer", padding: "0.5rem 0" }}>Previous Subscriptions ({subscriptionData.subscription_history.length})</summary>
                  <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                    {subscriptionData.subscription_history.map((sub) => (
                      <div key={sub.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem", background: "#f9fafb", borderRadius: "0.375rem", fontSize: "0.8rem" }}>
                        <span>{sub.plan_name} · {sub.billing_cycle} · {formatDate(sub.start_date)} — {formatDate(sub.end_date)}</span>
                        <span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "2px 8px", borderRadius: "999px", background: (statusColors[sub.status] || {}).bg || "#f3f4f6", color: (statusColors[sub.status] || {}).color || "#4b5563", textTransform: "capitalize" }}>{sub.status}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        )}

        {/* ======================== BILLING HISTORY TAB ======================== */}
        {activeTab === "history" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Payments */}
            <div style={{ background: "#fff", borderRadius: "0.5rem", border: "1px solid #e5e7eb", padding: "1.25rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#111827", margin: "0 0 0.75rem 0" }}>Payment History</h3>
              {billingHistory.payments?.length === 0 ? (
                <p style={{ color: "#9ca3af", textAlign: "center", padding: "1rem", fontSize: "0.85rem" }}>No payments yet.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                        <th style={{ padding: "0.5rem", color: "#6b7280", fontWeight: 600 }}>Date</th>
                        <th style={{ padding: "0.5rem", color: "#6b7280", fontWeight: 600 }}>Reference</th>
                        <th style={{ padding: "0.5rem", color: "#6b7280", fontWeight: 600 }}>Amount</th>
                        <th style={{ padding: "0.5rem", color: "#6b7280", fontWeight: 600 }}>Method</th>
                        <th style={{ padding: "0.5rem", color: "#6b7280", fontWeight: 600 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billingHistory.payments?.map((p) => (
                        <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "0.5rem" }}>{formatDate(p.payment_date)}</td>
                          <td style={{ padding: "0.5rem", fontWeight: 600 }}>{p.reference || `#${p.id}`}</td>
                          <td style={{ padding: "0.5rem", fontWeight: 600 }}>{formatCurrency(p.amount)}</td>
                          <td style={{ padding: "0.5rem" }}>{p.payment_method || "—"}</td>
                          <td style={{ padding: "0.5rem" }}><span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "2px 8px", borderRadius: "999px", background: (statusColors[p.status] || {}).bg || "#f3f4f6", color: (statusColors[p.status] || {}).color || "#4b5563", textTransform: "capitalize" }}>{p.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Invoices */}
            <div style={{ background: "#fff", borderRadius: "0.5rem", border: "1px solid #e5e7eb", padding: "1.25rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#111827", margin: "0 0 0.75rem 0" }}>Invoices</h3>
              {billingHistory.invoices?.length === 0 ? (
                <p style={{ color: "#9ca3af", textAlign: "center", padding: "1rem", fontSize: "0.85rem" }}>No invoices yet.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                        <th style={{ padding: "0.5rem", color: "#6b7280", fontWeight: 600 }}>Invoice #</th>
                        <th style={{ padding: "0.5rem", color: "#6b7280", fontWeight: 600 }}>Issue Date</th>
                        <th style={{ padding: "0.5rem", color: "#6b7280", fontWeight: 600 }}>Due Date</th>
                        <th style={{ padding: "0.5rem", color: "#6b7280", fontWeight: 600 }}>Amount</th>
                        <th style={{ padding: "0.5rem", color: "#6b7280", fontWeight: 600 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billingHistory.invoices?.map((inv) => (
                        <tr key={inv.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "0.5rem", fontWeight: 600 }}>{inv.invoice_number}</td>
                          <td style={{ padding: "0.5rem" }}>{formatDate(inv.issue_date)}</td>
                          <td style={{ padding: "0.5rem" }}>{formatDate(inv.due_date)}</td>
                          <td style={{ padding: "0.5rem", fontWeight: 600 }}>{formatCurrency(inv.amount)}</td>
                          <td style={{ padding: "0.5rem" }}><span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "2px 8px", borderRadius: "999px", background: (statusColors[inv.status] || {}).bg || "#f3f4f6", color: (statusColors[inv.status] || {}).color || "#4b5563", textTransform: "capitalize" }}>{inv.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </article>
    </section>
  );
}