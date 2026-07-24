import { useEffect, useMemo, useState } from "react";
import { FiBox, FiPlus, FiSearch, FiEye, FiEdit3, FiTrash2, FiUsers, FiTool, FiCheckCircle, FiAlertCircle, FiBarChart2 } from "react-icons/fi";
import api from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import Modal from "../../components/common/Modal.jsx";

const initialForm = {
  name: "",
  serial_number: "",
  category: "",
  site: "",
  description: "",
  status: "available",
  condition: "good",
  purchase_date: "",
  purchase_price: "",
  warranty_end_date: "",
  notes: "",
};

const statusOptions = [
  { value: "available", label: "Available" },
  { value: "in_use", label: "In Use" },
  { value: "maintenance", label: "Maintenance" },
  { value: "retired", label: "Retired" },
  { value: "lost", label: "Lost / Stolen" },
];

const conditionOptions = [
  { value: "new", label: "New" },
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
];

const statusColors = {
  available: { bg: "#dcfce7", color: "#166534" },
  in_use: { bg: "#dbeafe", color: "#1e40af" },
  maintenance: { bg: "#fef3c7", color: "#92400e" },
  retired: { bg: "#f3f4f6", color: "#374151" },
  lost: { bg: "#fee2e2", color: "#991b1b" },
};

const conditionColors = {
  new: { bg: "#dcfce7", color: "#166534" },
  excellent: { bg: "#86efac", color: "#14532d" },
  good: { bg: "#bbf7d0", color: "#15803d" },
  fair: { bg: "#fef3c7", color: "#92400e" },
  poor: { bg: "#fee2e2", color: "#991b1b" },
};

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return "—";
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2 }).format(amount);
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" });
};

export default function ManageAssetsPage() {
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sites, setSites] = useState([]);
  const [guards, setGuards] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSite, setFilterSite] = useState("");

  const loadAssets = async () => {
    try {
      const params = {};
      if (filterCategory) params.category_id = filterCategory;
      if (filterStatus) params.status = filterStatus;
      if (filterSite) params.site_id = filterSite;
      if (query.trim()) params.search = query.trim();

      const response = await api.get(endpoints.assets.assets, { params });
      setAssets(response.data.results || response.data || []);
      setError("");
    } catch {
      setError("Unable to load asset inventory.");
    }
  };

  const loadCategories = async () => {
    try {
      const response = await api.get(endpoints.assets.categories);
      setCategories(response.data.results || response.data || []);
    } catch {
      // categories are optional
    }
  };

  const loadSites = async () => {
    try {
      const response = await api.get(endpoints.patrols.sites);
      setSites(response.data.results || response.data || []);
    } catch {
      // sites are optional
    }
  };

  const loadGuards = async () => {
    try {
      const response = await api.get(endpoints.auth.users);
      const allUsers = response.data.results || response.data || [];
      setGuards(allUsers.filter((u) => u.role === "guard"));
    } catch {
      // guards are optional
    }
  };

  const loadDashboard = async () => {
    try {
      const response = await api.get(endpoints.assets.dashboard);
      setDashboard(response.data);
    } catch {
      // dashboard is optional
    }
  };

  useEffect(() => {
    loadAssets();
    loadCategories();
    loadSites();
    loadGuards();
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory, filterStatus, filterSite, query]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingAsset(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (asset) => {
    setEditingAsset(asset);
    setForm({
      name: asset.name || "",
      serial_number: asset.serial_number || "",
      category: asset.category ? String(asset.category) : "",
      site: asset.site ? String(asset.site) : "",
      description: asset.description || "",
      status: asset.status || "available",
      condition: asset.condition || "good",
      purchase_date: asset.purchase_date ? asset.purchase_date.split("T")[0] : "",
      purchase_price: asset.purchase_price || "",
      warranty_end_date: asset.warranty_end_date ? asset.warranty_end_date.split("T")[0] : "",
      notes: asset.notes || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus("");

    try {
      const payload = {
        ...form,
        category: form.category ? Number(form.category) : null,
        site: form.site ? Number(form.site) : null,
        purchase_price: form.purchase_price ? Number(form.purchase_price) : null,
      };

      if (editingAsset) {
        await api.put(`${endpoints.assets.assets}${editingAsset.id}/`, payload);
        setStatus("Asset updated successfully.");
      } else {
        await api.post(endpoints.assets.assets, payload);
        setStatus("Asset added successfully.");
      }

      setShowModal(false);
      resetForm();
      await loadAssets();
      await loadDashboard();
    } catch (requestError) {
      const msg = requestError?.response?.data
        ? Object.values(requestError.response.data).flat().join(", ")
        : "Failed to save asset.";
      setStatus(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (asset) => {
    if (!window.confirm(`Remove asset "${asset.name}" (${asset.serial_number})? This cannot be undone.`)) return;
    try {
      await api.delete(`${endpoints.assets.assets}${asset.id}/`);
      setStatus("Asset removed successfully.");
      await loadAssets();
      await loadDashboard();
    } catch {
      setStatus("Failed to remove asset.");
    }
  };

  const handleAssign = async (asset) => {
    setSelectedAsset(asset);
    setShowAssignModal(true);
  };

  const handleAssignmentSubmit = async (event) => {
    event.preventDefault();
    const guardId = event.target.elements.guard_id.value;
    if (!guardId) return;

    try {
      await api.post(endpoints.assets.assignment(selectedAsset.id), {
        action: "assign",
        guard_id: Number(guardId),
      });
      setStatus(`Asset assigned to ${guards.find((g) => g.id === Number(guardId))?.get_full_name || ""}.`);
      setShowAssignModal(false);
      await loadAssets();
      await loadDashboard();
    } catch (err) {
      setStatus(err?.response?.data?.error || "Failed to assign asset.");
    }
  };

  const handleUnassign = async (asset) => {
    if (!window.confirm(`Unassign "${asset.name}" from ${asset.guard_name}?`)) return;
    try {
      await api.post(endpoints.assets.assignment(asset.id), { action: "unassign" });
      setStatus("Asset unassigned successfully.");
      await loadAssets();
      await loadDashboard();
    } catch {
      setStatus("Failed to unassign asset.");
    }
  };

  const handleStatusChange = async (asset, newStatus) => {
    try {
      await api.post(endpoints.assets.assignment(asset.id), {
        action: "update_status",
        status: newStatus,
      });
      await loadAssets();
      await loadDashboard();
    } catch (err) {
      setStatus(err?.response?.data?.error || "Failed to update status.");
    }
  };

  const filteredAssets = useMemo(() => {
    return assets;
  }, [assets]);

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

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap", gap: "1.25rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>Asset Management</h2>
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.25rem", margin: 0 }}>Track and manage your security equipment, vehicles, and assets.</p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1.125rem", background: "#00E699", color: "#091e14", border: "none", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: "700", cursor: "pointer", transition: "background 0.2s", boxShadow: "0 2px 4px rgba(0, 230, 153, 0.15)" }}
            onMouseOver={(e) => e.currentTarget.style.background = "#00cc85"}
            onMouseOut={(e) => e.currentTarget.style.background = "#00E699"}
          >
            <FiPlus size={16} style={{ strokeWidth: 3 }} />
            Add Asset
          </button>
        </div>

        {/* Dashboard Summary */}
        {dashboard && (
          <div style={{ padding: "1.5rem", borderBottom: "1px solid #f1f5f9" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "600", color: "#111827", margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <FiBarChart2 size={18} /> Asset Overview
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem" }}>
              <div style={{ background: "#f9fafb", borderRadius: "0.5rem", padding: "1rem", textAlign: "center" }}>
                <div style={{ fontSize: "1.75rem", fontWeight: "700", color: "#0f172a" }}>{dashboard.total_assets}</div>
                <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Total Assets</div>
              </div>
              <div style={{ background: "#f9fafb", borderRadius: "0.5rem", padding: "1rem", textAlign: "center" }}>
                <div style={{ fontSize: "1.75rem", fontWeight: "700", color: "#166534" }}>{dashboard.status_counts?.in_use || 0}</div>
                <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>In Use</div>
              </div>
              <div style={{ background: "#f9fafb", borderRadius: "0.5rem", padding: "1rem", textAlign: "center" }}>
                <div style={{ fontSize: "1.75rem", fontWeight: "700", color: "#92400e" }}>{dashboard.assets_needing_maintenance || 0}</div>
                <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Maintenance</div>
              </div>
              <div style={{ background: "#f9fafb", borderRadius: "0.5rem", padding: "1rem", textAlign: "center" }}>
                <div style={{ fontSize: "1.75rem", fontWeight: "700", color: "#0f172a" }}>{formatCurrency(dashboard.total_value)}</div>
                <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Total Value</div>
              </div>
              <div style={{ background: "#f9fafb", borderRadius: "0.5rem", padding: "1rem", textAlign: "center" }}>
                <div style={{ fontSize: "1.75rem", fontWeight: "700", color: "#991b1b" }}>{dashboard.assets_out_of_warranty || 0}</div>
                <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Out of Warranty</div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.5rem", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
            <FiSearch size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, serial, or description..."
              style={{ ...inputStyles, paddingLeft: "2.5rem" }}
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ padding: "0.55rem 2rem 0.55rem 1rem", borderRadius: "0.375rem", border: "1px solid #cbd5e1", background: "#ffffff", fontSize: "0.875rem", fontWeight: "600", color: "#334155", cursor: "pointer", minWidth: "140px" }}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: "0.55rem 2rem 0.55rem 1rem", borderRadius: "0.375rem", border: "1px solid #cbd5e1", background: "#ffffff", fontSize: "0.875rem", fontWeight: "600", color: "#334155", cursor: "pointer", minWidth: "140px" }}
          >
            <option value="">All Statuses</option>
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={filterSite}
            onChange={(e) => setFilterSite(e.target.value)}
            style={{ padding: "0.55rem 2rem 0.55rem 1rem", borderRadius: "0.375rem", border: "1px solid #cbd5e1", background: "#ffffff", fontSize: "0.875rem", fontWeight: "600", color: "#334155", cursor: "pointer", minWidth: "140px" }}
          >
            <option value="">All Sites</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
        </div>

        {/* Messages */}
        {error ? <div style={{ margin: "1rem 1.5rem 0 1.5rem", padding: "0.75rem 1rem", background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: "500" }}>{error}</div> : null}
        {status ? <div style={{ margin: "1rem 1.5rem 0 1.5rem", padding: "0.75rem 1rem", background: status.includes("successfully") ? "#f0fdf4" : "#fef2f2", color: status.includes("successfully") ? "#166534" : "#991b1b", border: status.includes("successfully") ? "1px solid #bbf7d0" : "1px solid #fca5a5", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: "500" }}>{status}</div> : null}

        {/* Add/Edit Modal */}
        {showModal ? (
          <Modal title={editingAsset ? `Edit Asset: ${editingAsset.name}` : "Add New Asset"} onClose={() => { setShowModal(false); resetForm(); }}>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "0.5rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label style={labelStyles}>
                  Asset Name *
                  <input name="name" value={form.name} onChange={handleChange} required style={inputStyles} placeholder="e.g. Handheld Radio X200" />
                </label>
                <label style={labelStyles}>
                  Serial Number *
                  <input name="serial_number" value={form.serial_number} onChange={handleChange} required style={inputStyles} placeholder="e.g. HRX-2024-001" />
                </label>
              </div>

              <label style={labelStyles}>
                Category
                <select name="category" value={form.category} onChange={handleChange} style={{ ...inputStyles, cursor: "pointer" }}>
                  <option value="">No Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </label>

              <label style={labelStyles}>
                Site
                <select name="site" value={form.site} onChange={handleChange} style={{ ...inputStyles, cursor: "pointer" }}>
                  <option value="">No Site Assigned</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label style={labelStyles}>
                  Status
                  <select name="status" value={form.status} onChange={handleChange} style={{ ...inputStyles, cursor: "pointer" }}>
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </label>
                <label style={labelStyles}>
                  Condition
                  <select name="condition" value={form.condition} onChange={handleChange} style={{ ...inputStyles, cursor: "pointer" }}>
                    {conditionOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label style={labelStyles}>
                  Purchase Date
                  <input name="purchase_date" type="date" value={form.purchase_date} onChange={handleChange} style={inputStyles} />
                </label>
                <label style={labelStyles}>
                  Purchase Price (KES)
                  <input name="purchase_price" type="number" step="0.01" value={form.purchase_price} onChange={handleChange} style={inputStyles} placeholder="0.00" />
                </label>
              </div>

              <label style={labelStyles}>
                Warranty End Date
                <input name="warranty_end_date" type="date" value={form.warranty_end_date} onChange={handleChange} style={inputStyles} />
              </label>

              <label style={labelStyles}>
                Description
                <textarea name="description" value={form.description} onChange={handleChange} rows={2} style={{ ...inputStyles, resize: "vertical" }} placeholder="Brief description of the asset..." />
              </label>

              <label style={labelStyles}>
                Notes
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} style={{ ...inputStyles, resize: "vertical" }} placeholder="Additional notes..." />
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.75rem", borderTop: "1px solid #f1f5f9", paddingTop: "1.25rem" }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: "0.625rem 1.5rem", background: "#00E699", color: "#091e14", border: "none", borderRadius: "0.375rem", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" }}
                  onMouseOver={(e) => e.currentTarget.style.background = "#00cc85"}
                  onMouseOut={(e) => e.currentTarget.style.background = "#00E699"}
                >
                  {saving ? "Saving..." : editingAsset ? "Update Asset" : "Create Asset"}
                </button>
              </div>
            </form>
          </Modal>
        ) : null}

        {/* Assignment Modal */}
        {showAssignModal && selectedAsset ? (
          <Modal title={`Assign: ${selectedAsset.name}`} onClose={() => setShowAssignModal(false)}>
            <form onSubmit={handleAssignmentSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", background: "#f9fafb", borderRadius: "0.375rem" }}>
                <FiBox size={20} style={{ color: "#64748b" }} />
                <div>
                  <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "#0f172a" }}>{selectedAsset.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Serial: {selectedAsset.serial_number}</div>
                </div>
              </div>

              {selectedAsset.assigned_to && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem", background: "#dcfce7", borderRadius: "0.375rem", fontSize: "0.85rem", color: "#166534" }}>
                  <FiCheckCircle size={16} />
                  Currently assigned to: <strong>{selectedAsset.guard_name}</strong>
                </div>
              )}

              <label style={labelStyles}>
                Assign to Guard
                <select name="guard_id" defaultValue="" style={{ ...inputStyles, cursor: "pointer" }} required>
                  <option value="" disabled>Choose a guard...</option>
                  {guards.map((guard) => (
                    <option key={guard.id} value={guard.id}>
                      {guard.get_full_name ? guard.get_full_name() : ""} {guard.email}
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", borderTop: "1px solid #f1f5f9", paddingTop: "1.25rem" }}>
                {selectedAsset.assigned_to && (
                  <button
                    type="button"
                    onClick={() => handleUnassign(selectedAsset)}
                    style={{ padding: "0.5rem 1rem", background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5", borderRadius: "0.375rem", fontWeight: "600", cursor: "pointer", fontSize: "0.85rem" }}
                  >
                    Unassign
                  </button>
                )}
                <button
                  type="submit"
                  style={{ padding: "0.5rem 1.25rem", background: "#2563eb", color: "#fff", border: "none", borderRadius: "0.375rem", fontWeight: "600", cursor: "pointer", fontSize: "0.85rem" }}
                >
                  Assign
                </button>
              </div>
            </form>
          </Modal>
        ) : null}

        {/* Asset Table */}
        {filteredAssets.length ? (
          <div style={{ width: "100%", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Asset</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Serial</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Category</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Condition</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Assigned To</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Value</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                    onMouseOver={(e) => e.currentTarget.style.background = "#fafbfd"}
                    onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "1rem 1.5rem", fontSize: "0.875rem", fontWeight: "600", color: "#0f172a" }}>{asset.name}</td>
                    <td style={{ padding: "1rem 1.5rem", fontSize: "0.875rem", fontFamily: "monospace", color: "#64748b" }}>{asset.serial_number}</td>
                    <td style={{ padding: "1rem 1.5rem", fontSize: "0.875rem", color: "#475569" }}>{asset.category_name || <em style={{ color: "#94a3b8" }}>—</em>}</td>
                    <td style={{ padding: "1rem 1.5rem" }}>
                      <select
                        value={asset.status}
                        onChange={(e) => handleStatusChange(asset, e.target.value)}
                        style={{ fontSize: "0.75rem", fontWeight: "600", padding: "2px 8px", borderRadius: "999px", border: "1px solid #e2e8f0", background: (statusColors[asset.status] || {}).bg || "#f3f4f6", color: (statusColors[asset.status] || {}).color || "#4b5563", textTransform: "capitalize", cursor: "pointer" }}
                      >
                        {statusOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "1rem 1.5rem" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: "600", padding: "2px 8px", borderRadius: "999px", background: (conditionColors[asset.condition] || {}).bg || "#f3f4f6", color: (conditionColors[asset.condition] || {}).color || "#4b5563", textTransform: "capitalize" }}>{asset.condition}</span>
                    </td>
                    <td style={{ padding: "1rem 1.5rem", fontSize: "0.875rem", color: "#475569" }}>
                      {asset.guard_name ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <FiUsers size={12} style={{ color: "#64748b" }} />
                          {asset.guard_name}
                        </div>
                      ) : (
                        <em style={{ color: "#94a3b8" }}>Unassigned</em>
                      )}
                    </td>
                    <td style={{ padding: "1rem 1.5rem", fontSize: "0.875rem", fontFamily: "monospace", color: "#64748b" }}>{formatCurrency(asset.purchase_price)}</td>
                    <td style={{ padding: "1rem 1.5rem", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "0.25rem", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => handleAssign(asset)}
                          style={{ padding: "0.375rem 0.625rem", background: "#f0fdf4", color: "#059669", border: "1px solid #bbf7d0", borderRadius: "0.25rem", fontSize: "0.75rem", fontWeight: "600", cursor: "pointer" }}
                          title="Assign / Unassign"
                        >
                          <FiUsers size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(asset)}
                          style={{ padding: "0.375rem 0.625rem", background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: "0.25rem", fontSize: "0.75rem", fontWeight: "600", cursor: "pointer" }}
                          title="Edit"
                        >
                          <FiEdit3 size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(asset)}
                          style={{ padding: "0.375rem 0.625rem", background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: "0.25rem", fontSize: "0.75rem", fontWeight: "600", cursor: "pointer" }}
                          title="Delete"
                        >
                          <FiTrash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "5rem 2rem", background: "#ffffff" }}>
            <FiBox size={48} style={{ color: "#cbd5e1", marginBottom: "0.75rem" }} />
            <p style={{ fontSize: "1rem", fontWeight: "600", color: "#0f172a", margin: 0 }}>No assets found</p>
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.35rem", margin: 0 }}>Your asset inventory is empty. Add your first asset to get started.</p>
          </div>
        )}
      </article>
    </section>
  );
}
