import { useEffect, useState, useCallback } from "react";
import { FiUsers, FiFileText, FiDollarSign, FiCreditCard, FiPlus, FiEdit2, FiTrash2, FiX, FiCheck, FiAlertCircle, FiRefreshCw } from "react-icons/fi";
import api from "../../lib/api";
import { endpoints } from "../../lib/endpoints";

const TABS = [
  { key: "clients", label: "Clients", icon: <FiUsers size={16} /> },
  { key: "contracts", label: "Contracts", icon: <FiFileText size={16} /> },
  { key: "payments", label: "Payments", icon: <FiDollarSign size={16} /> },
  { key: "invoices", label: "Invoices", icon: <FiCreditCard size={16} /> },
];

const STATUS_STYLES = {
  active: { bg: "#d1fae5", color: "#065f46" },
  completed: { bg: "#dbeafe", color: "#1e40af" },
  pending: { bg: "#fef3c7", color: "#92400e" },
  failed: { bg: "#fce7f3", color: "#9d174d" },
  refunded: { bg: "#ede9fe", color: "#5b21b6" },
  draft: { bg: "#f3f4f6", color: "#4b5563" },
  sent: { bg: "#dbeafe", color: "#1e40af" },
  paid: { bg: "#d1fae5", color: "#065f46" },
  overdue: { bg: "#fef2f2", color: "#991b1b" },
  cancelled: { bg: "#f3f4f6", color: "#6b7280" },
  expired: { bg: "#fef3c7", color: "#92400e" },
  terminated: { bg: "#fce7f3", color: "#9d174d" },
};

const StatusBadge = ({ status }) => {
  const style = STATUS_STYLES[status] || { bg: "#f3f4f6", color: "#4b5563" };
  return (
    <span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "2px 8px", borderRadius: "999px", background: style.bg, color: style.color, textTransform: "capitalize" }}>
      {status}
    </span>
  );
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2 }).format(amount);
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" });
};

const emptyForm = (type) => {
  if (type === "client") return { name: "", email: "", phone: "", address: "", contact_person: "", notes: "" };
  if (type === "contract") return { client: "", title: "", description: "", amount: "", start_date: "", end_date: "", status: "draft", notes: "" };
  if (type === "payment") return { client: "", contract: "", amount: "", payment_date: new Date().toISOString().split("T")[0], method: "", reference: "", status: "pending", notes: "" };
  if (type === "invoice") return { client: "", contract: "", invoice_number: "", amount: "", issue_date: new Date().toISOString().split("T")[0], due_date: "", status: "draft", notes: "" };
  return {};
};

export default function ManageCRMPage() {
  const [activeTab, setActiveTab] = useState("clients");
  const [clients, setClients] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState({});
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(prev => ({ ...prev, [activeTab]: true }));
    setError("");
    try {
      const [clientsRes, contractsRes, paymentsRes, invoicesRes, statsRes] = await Promise.all([
        api.get(endpoints.crm.clients),
        api.get(endpoints.crm.contracts),
        api.get(endpoints.crm.payments),
        api.get(endpoints.crm.invoices),
        api.get(endpoints.crm.dashboard),
      ]);
      setClients(clientsRes.data.results || clientsRes.data || []);
      setContracts(contractsRes.data.results || contractsRes.data || []);
      setPayments(paymentsRes.data.results || paymentsRes.data || []);
      setInvoices(invoicesRes.data.results || invoicesRes.data || []);
      setStats(statsRes.data);
    } catch {
      setError("Unable to load CRM data.");
    } finally {
      setLoading(prev => ({ ...prev, [activeTab]: false }));
    }
  }, [activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreateForm = (type) => {
    setEditingItem(null);
    setFormData(emptyForm(type));
    setShowForm(true);
  };

  const openEditForm = (item, type) => {
    setEditingItem(item);
    const form = { ...item };
    // Convert date fields for inputs
    if (form.start_date) form.start_date = form.start_date.split("T")[0];
    if (form.end_date) form.end_date = form.end_date.split("T")[0];
    if (form.issue_date) form.issue_date = form.issue_date.split("T")[0];
    if (form.due_date) form.due_date = form.due_date.split("T")[0];
    if (form.payment_date) form.payment_date = form.payment_date.split("T")[0];
    setFormData(form);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setFormData({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    let endpoint, payload;
    const isEdit = !!editingItem;

    switch (activeTab) {
      case "clients":
        endpoint = endpoints.crm.clients;
        payload = { name: formData.name, email: formData.email, phone: formData.phone, address: formData.address, contact_person: formData.contact_person, notes: formData.notes };
        break;
      case "contracts":
        endpoint = endpoints.crm.contracts;
        payload = { client: formData.client, title: formData.title, description: formData.description, amount: formData.amount, start_date: formData.start_date, end_date: formData.end_date, status: formData.status, notes: formData.notes };
        break;
      case "payments":
        endpoint = endpoints.crm.payments;
        payload = { client: formData.client, contract: formData.contract || null, amount: formData.amount, payment_date: formData.payment_date, method: formData.method, reference: formData.reference, status: formData.status, notes: formData.notes };
        break;
      case "invoices":
        endpoint = endpoints.crm.invoices;
        payload = { client: formData.client, contract: formData.contract || null, invoice_number: formData.invoice_number, amount: formData.amount, issue_date: formData.issue_date, due_date: formData.due_date, status: formData.status, notes: formData.notes };
        break;
      default:
        return;
    }

    try {
      if (isEdit) {
        await api.put(`${endpoint}${editingItem.id}/`, payload);
      } else {
        await api.post(endpoint, payload);
      }
      closeForm();
      fetchData();
    } catch (err) {
      const msg = err?.response?.data ? Object.values(err.response.data).flat().join(", ") : "Failed to save";
      setError(msg);
    }
  };

  const handleDelete = async (id, type) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    setError("");
    let endpoint;
    switch (type) {
      case "client": endpoint = endpoints.crm.clients; break;
      case "contract": endpoint = endpoints.crm.contracts; break;
      case "payment": endpoint = endpoints.crm.payments; break;
      case "invoice": endpoint = endpoints.crm.invoices; break;
      default: return;
    }
    try {
      await api.delete(`${endpoint}${id}/`);
      fetchData();
    } catch {
      setError("Failed to delete item.");
    }
  };

  const renderStatsBar = () => {
    if (!stats) return null;
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <div style={{ background: "#fff", borderRadius: "0.5rem", border: "1px solid #e5e7eb", padding: "0.75rem 1rem" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Clients</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>{stats.total_clients}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: "0.5rem", border: "1px solid #e5e7eb", padding: "0.75rem 1rem" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Active Contracts</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#059669" }}>{stats.active_contracts}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: "0.5rem", border: "1px solid #e5e7eb", padding: "0.75rem 1rem" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Contract Value</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#111827" }}>{formatCurrency(stats.total_contract_value)}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: "0.5rem", border: "1px solid #e5e7eb", padding: "0.75rem 1rem" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Payments (30d)</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#2563eb" }}>{formatCurrency(stats.recent_payments_30d)}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: "0.5rem", border: "1px solid #e5e7eb", padding: "0.75rem 1rem" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Overdue Invoices</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: stats.overdue_invoices > 0 ? "#dc2626" : "#059669" }}>{stats.overdue_invoices}</div>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    const isLoading = loading[activeTab];

    if (isLoading && !clients.length && !contracts.length && !payments.length && !invoices.length) {
      return <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>Loading...</div>;
    }

    switch (activeTab) {
      case "clients":
        return (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                  <th style={{ padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 600 }}>Name</th>
                  <th style={{ padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 600 }}>Contact</th>
                  <th style={{ padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 600 }}>Email</th>
                  <th style={{ padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 600 }}>Contracts</th>
                  <th style={{ padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.75rem 0.5rem", fontWeight: 600, color: "#111827" }}>{client.name}</td>
                    <td style={{ padding: "0.75rem 0.5rem", color: "#374151" }}>{client.phone || "—"}</td>
                    <td style={{ padding: "0.75rem 0.5rem", color: "#374151" }}>{client.email || "—"}</td>
                    <td style={{ padding: "0.75rem 0.5rem" }}><span style={{ fontWeight: 600 }}>{client.contract_count || 0}</span></td>
                    <td style={{ padding: "0.75rem 0.5rem" }}>
                      <button onClick={() => openEditForm(client, "client")} style={{ border: "none", background: "none", cursor: "pointer", color: "#2563eb", marginRight: "0.5rem" }}><FiEdit2 size={14} /></button>
                      <button onClick={() => handleDelete(client.id, "client")} style={{ border: "none", background: "none", cursor: "pointer", color: "#dc2626" }}><FiTrash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
                {!clients.length && (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>No clients yet. Click "Add Client" to create one.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        );

      case "contracts":
        return (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                  <th style={{ padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 600 }}>Title</th>
                  <th style={{ padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 600 }}>Client</th>
                  <th style={{ padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 600 }}>Amount</th>
                  <th style={{ padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 600 }}>Period</th>
                  <th style={{ padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 600 }}>Status</th>
                  <th style={{ padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.75rem 0.5rem", fontWeight: 600, color: "#111827" }}>{contract.title}</td>
                    <td style={{ padding: "0.75rem 0.5rem", color: "#374151" }}>{contract.client_name}</td>
                    <td style={{ padding: "0.75rem 0.5rem", fontWeight: 600, color: "#111827" }}>{formatCurrency(contract.amount)}</td>
                    <td style={{ padding: "0.75rem 0.5rem", color: "#374151", fontSize: "0.8rem" }}>{formatDate(contract.start_date)} — {formatDate(contract.end_date)}</td>
                    <td style={{ padding: "0.75rem 0.5rem" }}><StatusBadge status={contract.status} /></td>
                    <td style={{ padding: "0.75rem 0.5rem" }}>
                      <button onClick={() => openEditForm(contract, "contract")} style={{ border: "none", background: "none", cursor: "pointer", color: "#2563eb", marginRight: "0.5rem" }}><FiEdit2 size={14} /></button>
                      <button onClick={() => handleDelete(contract.id, "contract")} style={{ border: "none", background: "none", cursor: "pointer", color: "#dc2626" }}><FiTrash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
                {!contracts.length && (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>No contracts yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        );

      case "payments":
        return (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                  <th style={{ padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 600 }}>Reference</th>
                  <th style={{ padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 600 }}>Client</th>
                  <th style={{ padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 600 }}>Amount</th>
                  <th style={{ padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 600 }}>Date</th>
                  <th style={{ padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 600 }}>Method</th>
                  <th style={{ padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 600 }}>Status</th>
                  <th style={{ padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.75rem 0.5rem", fontWeight: 600, color: "#111827" }}>{payment.reference || `#${payment.id}`}</td>
                    <td style={{ padding: "0.75rem 0.5rem", color: "#374151" }}>{payment.client_name}</td>
                    <td style={{ padding: "0.75rem 0.5rem", fontWeight: 600, color: "#111827" }}>{formatCurrency(payment.amount)}</td>
                    <td style={{ padding: "0.75rem 0.5rem", color: "#374151" }}>{formatDate(payment.payment_date)}</td>
                    <td style={{ padding: "0.75rem 0.5rem", color: "#374151" }}>{payment.method || "—"}</td>
                    <td style={{ padding: "0.75rem 0.5rem" }}><StatusBadge status={payment.status} /></td>
                    <td style={{ padding: "0.75rem 0.5rem" }}>
                      <button onClick={() => openEditForm(payment, "payment")} style={{ border: "none", background: "none", cursor: "pointer", color: "#2563eb", marginRight: "0.5rem" }}><FiEdit2 size={14} /></button>
                      <button onClick={() => handleDelete(payment.id, "payment")} style={{ border: "none", background: "none", cursor: "pointer", color: "#dc2626" }}><FiTrash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
                {!payments.length && (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>No payments recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        );

      case "invoices":
        return (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                  <th style={{ padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 600 }}>Invoice #</th>
                  <th style={{ padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 600 }}>Client</th>
                  <th style={{ padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 600 }}>Amount</th>
                  <th style={{ padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 600 }}>Issue Date</th>
                  <th style={{ padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 600 }}>Due Date</th>
                  <th style={{ padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 600 }}>Status</th>
                  <th style={{ padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.75rem 0.5rem", fontWeight: 600, color: "#111827" }}>{invoice.invoice_number}</td>
                    <td style={{ padding: "0.75rem 0.5rem", color: "#374151" }}>{invoice.client_name}</td>
                    <td style={{ padding: "0.75rem 0.5rem", fontWeight: 600, color: "#111827" }}>{formatCurrency(invoice.amount)}</td>
                    <td style={{ padding: "0.75rem 0.5rem", color: "#374151" }}>{formatDate(invoice.issue_date)}</td>
                    <td style={{ padding: "0.75rem 0.5rem", color: "#374151" }}>{formatDate(invoice.due_date)}</td>
                    <td style={{ padding: "0.75rem 0.5rem" }}><StatusBadge status={invoice.status} /></td>
                    <td style={{ padding: "0.75rem 0.5rem" }}>
                      <button onClick={() => openEditForm(invoice, "invoice")} style={{ border: "none", background: "none", cursor: "pointer", color: "#2563eb", marginRight: "0.5rem" }}><FiEdit2 size={14} /></button>
                      <button onClick={() => handleDelete(invoice.id, "invoice")} style={{ border: "none", background: "none", cursor: "pointer", color: "#dc2626" }}><FiTrash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
                {!invoices.length && (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>No invoices yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        );

      default:
        return null;
    }
  };

  const renderForm = () => {
    if (!showForm) return null;

    const isEdit = !!editingItem;
    const title = isEdit ? `Edit ${activeTab.slice(0, -1)}` : `Add ${activeTab.slice(0, -1)}`;

    const renderFields = () => {
      switch (activeTab) {
        case "clients":
          return (
            <>
              <div className="field-group" style={{ marginBottom: "0.75rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Name *</label>
                <input name="name" value={formData.name || ""} onChange={handleInputChange} required style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <div className="field-group">
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Email</label>
                  <input name="email" type="email" value={formData.email || ""} onChange={handleInputChange} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }} />
                </div>
                <div className="field-group">
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Phone</label>
                  <input name="phone" value={formData.phone || ""} onChange={handleInputChange} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }} />
                </div>
              </div>
              <div className="field-group" style={{ marginBottom: "0.75rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Contact Person</label>
                <input name="contact_person" value={formData.contact_person || ""} onChange={handleInputChange} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }} />
              </div>
              <div className="field-group" style={{ marginBottom: "0.75rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Address</label>
                <textarea name="address" value={formData.address || ""} onChange={handleInputChange} rows={2} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem", resize: "vertical" }} />
              </div>
              <div className="field-group" style={{ marginBottom: "0.75rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Notes</label>
                <textarea name="notes" value={formData.notes || ""} onChange={handleInputChange} rows={2} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem", resize: "vertical" }} />
              </div>
            </>
          );

        case "contracts":
          return (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <div className="field-group">
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Client *</label>
                  <select name="client" value={formData.client || ""} onChange={handleInputChange} required style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }}>
                    <option value="">Select client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Status</label>
                  <select name="status" value={formData.status || "draft"} onChange={handleInputChange} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }}>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
              </div>
              <div className="field-group" style={{ marginBottom: "0.75rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Title *</label>
                <input name="title" value={formData.title || ""} onChange={handleInputChange} required style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }} />
              </div>
              <div className="field-group" style={{ marginBottom: "0.75rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Description</label>
                <textarea name="description" value={formData.description || ""} onChange={handleInputChange} rows={2} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem", resize: "vertical" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <div className="field-group">
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Amount *</label>
                  <input name="amount" type="number" step="0.01" value={formData.amount || ""} onChange={handleInputChange} required style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }} />
                </div>
                <div className="field-group">
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Start Date *</label>
                  <input name="start_date" type="date" value={formData.start_date || ""} onChange={handleInputChange} required style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }} />
                </div>
                <div className="field-group">
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>End Date *</label>
                  <input name="end_date" type="date" value={formData.end_date || ""} onChange={handleInputChange} required style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }} />
                </div>
              </div>
              <div className="field-group" style={{ marginBottom: "0.75rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Notes</label>
                <textarea name="notes" value={formData.notes || ""} onChange={handleInputChange} rows={2} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem", resize: "vertical" }} />
              </div>
            </>
          );

        case "payments":
          return (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <div className="field-group">
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Client *</label>
                  <select name="client" value={formData.client || ""} onChange={handleInputChange} required style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }}>
                    <option value="">Select client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Contract</label>
                  <select name="contract" value={formData.contract || ""} onChange={handleInputChange} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }}>
                    <option value="">— Optional —</option>
                    {contracts.filter(c => c.status === "active").map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <div className="field-group">
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Amount *</label>
                  <input name="amount" type="number" step="0.01" value={formData.amount || ""} onChange={handleInputChange} required style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }} />
                </div>
                <div className="field-group">
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Payment Date</label>
                  <input name="payment_date" type="date" value={formData.payment_date || ""} onChange={handleInputChange} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <div className="field-group">
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Method</label>
                  <input name="method" value={formData.method || ""} onChange={handleInputChange} placeholder="e.g. M-Pesa, Bank Transfer" style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }} />
                </div>
                <div className="field-group">
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Reference</label>
                  <input name="reference" value={formData.reference || ""} onChange={handleInputChange} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <div className="field-group">
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Status</label>
                  <select name="status" value={formData.status || "pending"} onChange={handleInputChange} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }}>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
              </div>
              <div className="field-group" style={{ marginBottom: "0.75rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Notes</label>
                <textarea name="notes" value={formData.notes || ""} onChange={handleInputChange} rows={2} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem", resize: "vertical" }} />
              </div>
            </>
          );

        case "invoices":
          return (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <div className="field-group">
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Client *</label>
                  <select name="client" value={formData.client || ""} onChange={handleInputChange} required style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }}>
                    <option value="">Select client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Contract</label>
                  <select name="contract" value={formData.contract || ""} onChange={handleInputChange} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }}>
                    <option value="">— Optional —</option>
                    {contracts.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
              </div>
              <div className="field-group" style={{ marginBottom: "0.75rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Invoice Number *</label>
                <input name="invoice_number" value={formData.invoice_number || ""} onChange={handleInputChange} required style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <div className="field-group">
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Amount *</label>
                  <input name="amount" type="number" step="0.01" value={formData.amount || ""} onChange={handleInputChange} required style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }} />
                </div>
                <div className="field-group">
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Issue Date</label>
                  <input name="issue_date" type="date" value={formData.issue_date || ""} onChange={handleInputChange} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }} />
                </div>
                <div className="field-group">
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Due Date *</label>
                  <input name="due_date" type="date" value={formData.due_date || ""} onChange={handleInputChange} required style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <div className="field-group">
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Status</label>
                  <select name="status" value={formData.status || "draft"} onChange={handleInputChange} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem" }}>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="field-group" style={{ marginBottom: "0.75rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Notes</label>
                <textarea name="notes" value={formData.notes || ""} onChange={handleInputChange} rows={2} style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", fontSize: "0.85rem", resize: "vertical" }} />
              </div>
            </>
          );

        default:
          return null;
      }
    };

    return (
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
        <div style={{ background: "#fff", borderRadius: "0.75rem", padding: "1.5rem", width: "90%", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#111827" }}>{title}</h3>
            <button onClick={closeForm} style={{ border: "none", background: "none", cursor: "pointer", color: "#6b7280" }}><FiX size={20} /></button>
          </div>
          <form onSubmit={handleSubmit}>
            {renderFields()}
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1rem", borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>
              <button type="button" onClick={closeForm} style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500 }}>Cancel</button>
              <button type="submit" style={{ padding: "0.5rem 1.5rem", borderRadius: "0.375rem", border: "none", background: "#2563eb", color: "#fff", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <FiCheck size={16} /> {isEdit ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <section className="panel-grid single admin-stack" style={{ fontFamily: "system-ui, sans-serif" }}>
      <article className="panel" style={{ border: "none", boxShadow: "none", background: "transparent" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#111827", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <FiUsers /> Client Management
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: "0.25rem 0 0 0" }}>Manage clients, contracts, payments, and invoices</p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={fetchData} style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 1rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500, color: "#374151" }}>
              <FiRefreshCw size={14} /> Refresh
            </button>
            <button onClick={() => openCreateForm(activeTab)} style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 1rem", borderRadius: "0.375rem", border: "none", background: "#2563eb", color: "#fff", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
              <FiPlus size={14} /> Add {activeTab.slice(0, -1)}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1rem", background: "#fef2f2", borderRadius: "0.5rem", border: "1px solid #fca5a5", color: "#991b1b", fontSize: "0.85rem", marginBottom: "1rem" }}>
            <FiAlertCircle size={16} /> {error}
          </div>
        )}

        {renderStatsBar()}

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.25rem", borderBottom: "2px solid #e5e7eb", paddingBottom: "0" }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
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
                transition: "all 0.15s",
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: "#fff", borderRadius: "0.5rem", border: "1px solid #e5e7eb", overflow: "hidden" }}>
          {renderTable()}
        </div>

        {renderForm()}
      </article>
    </section>
  );
}