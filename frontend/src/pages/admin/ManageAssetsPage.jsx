import { useEffect, useState } from "react";
import { FiPlus, FiBox, FiMail, FiUser, FiShield, FiSearch, FiFilter, FiEdit, FiTrash2, FiX, FiCheck } from "react-icons/fi";
import api from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import Modal from "../../components/common/Modal.jsx";

const initialForm = {
  name: "",
  serial_number: "",
  description: "",
  category: "",
  site: "",
  status: "available",
  condition: "good",
  purchase_date: "",
  purchase_price: "",
  warranty_end_date: "",
  notes: "",
};

export default function ManageAssetsPage() {
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sites, setSites] = useState([]);
  const [guards, setGuards] = useState([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [assignmentHistory, setAssignmentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadAssets = async () => {
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (filterStatus) params.status = filterStatus;
      if (filterCategory) params.category_id = filterCategory;
      
      const response = await api.get(endpoints.assets.assets, { params });
      setAssets(response.data.results || response.data);
      setError("");
    } catch {
      setError("Unable to retrieve asset registry.");
    }
  };

  const loadCategories = async () => {
    try {
      const response = await api.get(endpoints.assets.categories);
      setCategories(response.data.results || response.data);
    } catch {
      // Silently fail - categories are optional
    }
  };

  const loadSites = async () => {
    try {
      const response = await api.get(endpoints.patrols.sites);
      setSites(response.data.results || response.data);
    } catch {
      // Silently fail - sites are optional
    }
  };

  const loadGuards = async () => {
    try {
      const response = await api.get(endpoints.auth.users);
      const allUsers = response.data.results || response.data;
      setGuards(allUsers.filter(user => user.role === 'guard'));
    } catch {
      // Silently fail
    }
  };

  useEffect(() => {
    loadAssets();
    loadCategories();
    loadSites();
    loadGuards();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadAssets();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, filterStatus, filterCategory]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus("");

    try {
      const payload = {
        ...form,
        category: form.category ? parseInt(form.category) : null,
        site: form.site ? parseInt(form.site) : null,
        purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
      };

      if (editingId) {
        await api.put(`${endpoints.assets.assets}${editingId}/`, payload);
        setStatus("Asset record updated successfully.");
      } else {
        await api.post(endpoints.assets.assets, payload);
        setStatus("Asset registered successfully.");
      }
      
      setForm(initialForm);
      setEditingId(null);
      setShowModal(false);
      await loadAssets();
    } catch (requestError) {
      setStatus(requestError?.response?.data?.detail || requestError?.response?.data?.serial_number?.[0] || "Failed to process asset record.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (asset) => {
    setEditingId(asset.id);
    setForm({
      name: asset.name || "",
      serial_number: asset.serial_number || "",
      description: asset.description || "",
      category: asset.category?.toString() || "",
      site: asset.site?.toString() || "",
      status: asset.status || "available",
      condition: asset.condition || "good",
      purchase_date: asset.purchase_date || "",
      purchase_price: asset.purchase_price?.toString() || "",
      warranty_end_date: asset.warranty_end_date || "",
      notes: asset.notes || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (assetId) => {
    if (!window.confirm("Are you sure you want to delete this asset? This action cannot be undone.")) {
      return;
    }

    try {
      await api.delete(`${endpoints.assets.assets}${assetId}/`);
      setStatus("Asset deleted successfully.");
      await loadAssets();
    } catch (requestError) {
      setStatus(requestError?.response?.data?.detail || "Failed to delete asset.");
    }
  };

  const handleAssign = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus("");

    try {
      const guardId = form.assigned_to;
      await api.post(endpoints.assets.assignment(selectedAsset.id), {
        action: "assign",
        guard_id: parseInt(guardId),
      });
      
      setForm(initialForm);
      setSelectedAsset(null);
      setShowAssignModal(false);
      setStatus("Asset assigned successfully.");
      await loadAssets();
    } catch (requestError) {
      setStatus(requestError?.response?.data?.error || "Failed to assign asset.");
    } finally {
      setSaving(false);
    }
  };

  const handleUnassign = async (assetId) => {
    try {
      await api.post(endpoints.assets.assignment(assetId), {
        action: "unassign",
      });
      setStatus("Asset unassigned successfully.");
      await loadAssets();
    } catch (requestError) {
      setStatus(requestError?.response?.data?.error || "Failed to unassign asset.");
    }
  };

  const handleStatusUpdate = async (assetId, newStatus) => {
    try {
      await api.post(endpoints.assets.assignment(assetId), {
        action: "update_status",
        status: newStatus,
      });
      setStatus(`Asset status updated to ${newStatus.replace('_', ' ')}.`);
      await loadAssets();
    } catch (requestError) {
      setStatus(requestError?.response?.data?.error || "Failed to update asset status.");
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm(initialForm);
    setShowModal(true);
  };

  const openAssignModal = (asset) => {
    setSelectedAsset(asset);
    setForm({ ...initialForm, assigned_to: asset.assigned_to?.toString() || "" });
    setShowAssignModal(true);
  };

  const loadAssignmentHistory = async (assetId) => {
    setLoadingHistory(true);
    try {
      const response = await api.get(endpoints.assets.assetAssignmentHistory(assetId));
      setAssignmentHistory(response.data || []);
      setShowHistoryModal(true);
    } catch {
      setError("Unable to retrieve assignment history.");
    } finally {
      setLoadingHistory(false);
    }
  };

  const getStatusBadgeStyles = (status) => {
    switch (status?.toLowerCase()) {
      case "available":
        return { background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" };
      case "in_use":
        return { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" };
      case "maintenance":
        return { background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" };
      case "retired":
        return { background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1" };
      case "lost":
      case "lost / stolen":
        return { background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5" };
      default:
        return { background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0" };
    }
  };

  const getConditionBadgeStyles = (condition) => {
    switch (condition?.toLowerCase()) {
      case "new":
        return { background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" };
      case "excellent":
        return { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" };
      case "good":
        return { background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" };
      case "fair":
        return { background: "#fff7ed", color: "#9a3412", border: "1px solid #fed7aa" };
      case "poor":
        return { background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5" };
      default:
        return { background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0" };
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
        
        {/* Modern Header Row Panel */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap", gap: "1.25rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>
              <FiBox /> Asset Management
            </h2>
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.25rem", margin: 0 }}>
              Track, assign, and manage company equipment and security assets.
            </p>
          </div>
          <button 
            type="button" 
            onClick={openAddModal}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1.125rem", background: "#00E699", color: "#091e14", border: "none", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: "700", cursor: "pointer", transition: "background 0.2s", boxShadow: "0 2px 4px rgba(0, 230, 153, 0.15)" }}
            onMouseOver={(e) => e.currentTarget.style.background = "#00cc85"}
            onMouseOut={(e) => e.currentTarget.style.background = "#00E699"}
          >
            <FiPlus size={16} style={{ strokeWidth: 3 }} />
            Register Asset
          </button>
        </div>

        {/* System Action Status Feedback Banners */}
        {error ? <div style={{ margin: "1rem 1.5rem 0 1.5rem", padding: "0.75rem 1rem", background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: "500" }}>{error}</div> : null}
        {status ? <div style={{ margin: "1rem 1.5rem 0 1.5rem", padding: "0.75rem 1rem", background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: "500" }}>{status}</div> : null}

        {/* Search and Filter Controls */}
        <div style={{ padding: "1.5rem", borderBottom: "1px solid #f1f5f9", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 300px", position: "relative" }}>
            <FiSearch style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} size={16} />
            <input
              type="text"
              placeholder="Search assets by name, serial number, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...inputStyles, paddingLeft: "2.5rem" }}
            />
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ ...inputStyles, minWidth: "150px", cursor: "pointer" }}
            >
              <option value="">All Statuses</option>
              <option value="available">Available</option>
              <option value="in_use">In Use</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retired</option>
              <option value="lost">Lost / Stolen</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ ...inputStyles, minWidth: "150px", cursor: "pointer" }}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Add/Edit Asset Form Modal */}
        {showModal ? (
          <Modal title={editingId ? "Edit Asset Record" : "Register New Asset"} onClose={() => { setShowModal(false); setEditingId(null); }}>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "0.5rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label style={labelStyles}>
                  Asset Name
                  <input name="name" value={form.name} onChange={handleChange} required style={inputStyles} placeholder="e.g., Security Radio #1" />
                </label>
                <label style={labelStyles}>
                  Serial Number
                  <input name="serial_number" value={form.serial_number} onChange={handleChange} required style={inputStyles} placeholder="SN-XXXX-XXXX" />
                </label>
              </div>

              <label style={labelStyles}>
                Description
                <textarea name="description" value={form.description} onChange={handleChange} rows="3" style={{ ...inputStyles, resize: "vertical" }} placeholder="Asset details and specifications..." />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label style={labelStyles}>
                  Category
                  <select name="category" value={form.category} onChange={handleChange} style={{ ...inputStyles, cursor: "pointer" }}>
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </label>
                <label style={labelStyles}>
                  Site Location
                  <select name="site" value={form.site} onChange={handleChange} style={{ ...inputStyles, cursor: "pointer" }}>
                    <option value="">Select Site</option>
                    {sites.map(site => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label style={labelStyles}>
                  Status
                  <select name="status" value={form.status} onChange={handleChange} style={{ ...inputStyles, cursor: "pointer" }}>
                    <option value="available">Available</option>
                    <option value="in_use">In Use</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="retired">Retired</option>
                    <option value="lost">Lost / Stolen</option>
                  </select>
                </label>
                <label style={labelStyles}>
                  Condition
                  <select name="condition" value={form.condition} onChange={handleChange} style={{ ...inputStyles, cursor: "pointer" }}>
                    <option value="new">New</option>
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label style={labelStyles}>
                  Purchase Date
                  <input name="purchase_date" type="date" value={form.purchase_date} onChange={handleChange} style={inputStyles} />
                </label>
                <label style={labelStyles}>
                  Purchase Price ($)
                  <input name="purchase_price" type="number" step="0.01" value={form.purchase_price} onChange={handleChange} style={inputStyles} placeholder="0.00" />
                </label>
              </div>

              <label style={labelStyles}>
                Warranty End Date
                <input name="warranty_end_date" type="date" value={form.warranty_end_date} onChange={handleChange} style={inputStyles} />
              </label>

              <label style={labelStyles}>
                Notes
                <textarea name="notes" value={form.notes} onChange={handleChange} rows="3" style={{ ...inputStyles, resize: "vertical" }} placeholder="Additional notes..." />
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.75rem", borderTop: "1px solid #f1f5f9", paddingTop: "1.25rem" }}>
                <button 
                  type="submit" 
                  disabled={saving}
                  style={{ padding: "0.625rem 1.5rem", background: "#00E699", color: "#091e14", border: "none", borderRadius: "0.375rem", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" }}
                  onMouseOver={(e) => e.currentTarget.style.background = "#00cc85"}
                  onMouseOut={(e) => e.currentTarget.style.background = "#00E699"}
                >
                  {saving ? "Processing..." : (editingId ? "Update Asset" : "Register Asset")}
                </button>
              </div>
            </form>
          </Modal>
        ) : null}

        {/* Assign Asset Modal */}
        {showAssignModal && selectedAsset ? (
          <Modal title={`Assign Asset: ${selectedAsset.name}`} onClose={() => { setShowAssignModal(false); setSelectedAsset(null); }}>
            <form onSubmit={handleAssign} style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "0.5rem" }}>
              <div style={{ padding: "1rem", background: "#f8fafc", borderRadius: "0.375rem", border: "1px solid #e2e8f0" }}>
                <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.875rem", color: "#64748b" }}>Serial Number</p>
                <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: "600", color: "#0f172a" }}>{selectedAsset.serial_number}</p>
                <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", color: "#64748b" }}>Current Status</p>
                <span style={{ 
                  display: "inline-block",
                  padding: "0.25rem 0.625rem", 
                  borderRadius: "0.25rem", 
                  fontSize: "0.75rem", 
                  fontWeight: "700",
                  ...getStatusBadgeStyles(selectedAsset.status)
                }}>
                  {selectedAsset.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <label style={labelStyles}>
                Assign To Guard
                <select name="assigned_to" value={form.assigned_to} onChange={handleChange} required style={{ ...inputStyles, cursor: "pointer" }}>
                  <option value="">Select Guard</option>
                  {guards.map(guard => (
                    <option key={guard.id} value={guard.id}>
                      {guard.first_name && guard.last_name 
                        ? `${guard.first_name} ${guard.last_name} (${guard.email})`
                        : guard.email}
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.75rem", borderTop: "1px solid #f1f5f9", paddingTop: "1.25rem" }}>
                <button 
                  type="button"
                  onClick={() => { setShowAssignModal(false); setSelectedAsset(null); }}
                  style={{ padding: "0.625rem 1.5rem", background: "#ffffff", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "0.375rem", fontWeight: "600", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  style={{ padding: "0.625rem 1.5rem", background: "#00E699", color: "#091e14", border: "none", borderRadius: "0.375rem", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" }}
                  onMouseOver={(e) => e.currentTarget.style.background = "#00cc85"}
                  onMouseOut={(e) => e.currentTarget.style.background = "#00E699"}
                >
                  {saving ? "Assigning..." : "Assign Asset"}
                </button>
              </div>
            </form>
          </Modal>
        ) : null}

        {/* Asset Data Grid Interface */}
        {assets.length ? (
          <div style={{ width: "100%", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Asset</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Serial Number</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Category</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Condition</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Assigned To</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr 
                    key={asset.id} 
                    style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                    onMouseOver={(e) => e.currentTarget.style.background = "#fafbfd"}
                    onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "1rem 1.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ width: "2rem", height: "2rem", borderRadius: "0.375rem", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #e2e8f0", color: "#64748b" }}>
                          <FiBox size={14} />
                        </div>
                        <div>
                          <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "#0f172a", display: "block" }}>
                            {asset.name}
                          </span>
                          {asset.category_name && (
                            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                              {asset.category_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: "1rem 1.5rem" }}>
                      <span style={{ fontSize: "0.875rem", color: "#475569", fontFamily: "monospace" }}>
                        {asset.serial_number}
                      </span>
                    </td>

                    <td style={{ padding: "1rem 1.5rem" }}>
                      <span style={{ fontSize: "0.875rem", color: "#475569" }}>
                        {asset.category_name || "—"}
                      </span>
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
                        ...getStatusBadgeStyles(asset.status)
                      }}>
                        {asset.status.replace('_', ' ')}
                      </span>
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
                        ...getConditionBadgeStyles(asset.condition)
                      }}>
                        {asset.condition}
                      </span>
                    </td>

                    <td style={{ padding: "1rem 1.5rem" }}>
                      {asset.guard_name ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                          <div style={{ width: "1.5rem", height: "1.5rem", borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #e2e8f0", color: "#64748b" }}>
                            <FiUser size={10} />
                          </div>
                          <span style={{ fontSize: "0.875rem", color: "#475569" }}>
                            {asset.guard_name}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.875rem", color: "#94a3b8", fontStyle: "italic" }}>Unassigned</span>
                      )}
                    </td>

                    <td style={{ padding: "1rem 1.5rem" }}>
                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => openAssignModal(asset)}
                          title={asset.assigned_to ? "Reassign" : "Assign"}
                          style={{ padding: "0.375rem 0.625rem", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: "0.25rem", fontSize: "0.75rem", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}
                        >
                          <FiUser size={12} />
                          {asset.assigned_to ? "Reassign" : "Assign"}
                        </button>
                        {asset.assigned_to && (
                          <button
                            type="button"
                            onClick={() => handleUnassign(asset.id)}
                            title="Return Asset"
                            style={{ padding: "0.375rem 0.625rem", background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", borderRadius: "0.25rem", fontSize: "0.75rem", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}
                          >
                            <FiX size={12} />
                            Return
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => loadAssignmentHistory(asset.id)}
                          title="View Assignment History"
                          style={{ padding: "0.375rem 0.625rem", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: "0.25rem", fontSize: "0.75rem", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}
                        >
                          <FiFilter size={12} />
                          History
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(asset)}
                          title="Edit"
                          style={{ padding: "0.375rem 0.625rem", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: "0.25rem", fontSize: "0.75rem", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}
                        >
                          <FiEdit size={12} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(asset.id)}
                          title="Delete"
                          style={{ padding: "0.375rem 0.625rem", background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5", borderRadius: "0.25rem", fontSize: "0.75rem", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}
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
            <FiBox size={48} style={{ color: "#cbd5e1", marginBottom: "1rem" }} />
            <p style={{ fontSize: "1rem", fontWeight: "600", color: "#0f172a", margin: 0 }}>No assets registered</p>
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.35rem", margin: 0 }}>
              Get started by registering your first security asset or equipment.
            </p>
          </div>
        )}

        {/* Assignment History Modal */}
        {showHistoryModal ? (
          <Modal title="Assignment History" onClose={() => setShowHistoryModal(false)}>
            <div style={{ padding: "0.5rem", maxHeight: "500px", overflowY: "auto" }}>
              {loadingHistory ? (
                <div style={{ textAlign: "center", padding: "2rem" }}>
                  <p style={{ color: "#64748b" }}>Loading history...</p>
                </div>
              ) : assignmentHistory.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {assignmentHistory.map((record) => (
                    <div 
                      key={record.id} 
                      style={{ 
                        padding: "1rem", 
                        background: "#f8fafc", 
                        borderRadius: "0.375rem", 
                        border: "1px solid #e2e8f0",
                        borderLeft: record.assigned_to ? "3px solid #00E699" : "3px solid #94a3b8"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                        <div>
                          <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.875rem", fontWeight: "600", color: "#0f172a" }}>
                            {record.assigned_to_name || "Unassigned"}
                          </p>
                          {record.assigned_to_email && (
                            <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>
                              {record.assigned_to_email}
                            </p>
                          )}
                        </div>
                        <span style={{ 
                          padding: "0.25rem 0.5rem", 
                          borderRadius: "0.25rem", 
                          fontSize: "0.75rem", 
                          fontWeight: "600",
                          background: record.assigned_to ? "#f0fdf4" : "#f1f5f9",
                          color: record.assigned_to ? "#166534" : "#475569"
                        }}>
                          {record.duration}
                        </span>
                      </div>
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.75rem", color: "#64748b" }}>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <span style={{ fontWeight: "600" }}>Assigned:</span>
                          <span>{new Date(record.assigned_at).toLocaleString()}</span>
                        </div>
                        {record.unassigned_at && (
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <span style={{ fontWeight: "600" }}>Unassigned:</span>
                            <span>{new Date(record.unassigned_at).toLocaleString()}</span>
                          </div>
                        )}
                        {record.notes && (
                          <div style={{ marginTop: "0.5rem", padding: "0.5rem", background: "#ffffff", borderRadius: "0.25rem", border: "1px solid #e2e8f0" }}>
                            <span style={{ fontWeight: "600" }}>Notes: </span>
                            {record.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "2rem" }}>
                  <p style={{ fontSize: "0.875rem", color: "#64748b", margin: 0 }}>No assignment history found.</p>
                </div>
              )}
            </div>
          </Modal>
        ) : null}
      </article>
    </section>
  );
}
