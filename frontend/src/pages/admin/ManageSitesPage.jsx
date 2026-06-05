import { useEffect, useMemo, useState } from "react";
import { FiEye, FiPlus, FiSearch } from "react-icons/fi";
import api from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import Modal from "../../components/common/Modal.jsx";

const initialForm = {
  name: "",
  location_name: "",
  latitude: "",
  longitude: "",
};

export default function ManageSitesPage() {
  const [sites, setSites] = useState([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [query, setQuery] = useState("");

  const loadSites = async () => {
    try {
      const response = await api.get(endpoints.patrols.sites);
      setSites(response.data.results || response.data);
      setError("");
    } catch {
      setError("Unable to load site list.");
    }
  };

  useEffect(() => {
    loadSites();
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
      await api.post(endpoints.patrols.adminSites, {
        name: form.name,
        location_name: form.location_name,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      });
      setForm(initialForm);
      setShowModal(false);
      setStatus("Site added successfully.");
      await loadSites();
    } catch (requestError) {
      setStatus(requestError?.response?.data?.detail || "Unable to add site.");
    } finally {
      setSaving(false);
    }
  };

  const filteredSites = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return sites;

    return sites.filter((site) => {
      const name = site.name?.toLowerCase() || "";
      const location = site.location_name?.toLowerCase() || "";
      const organisation = site.organisation_name?.toLowerCase() || "";
      return name.includes(search) || location.includes(search) || organisation.includes(search);
    });
  }, [query, sites]);

  const formatCoordinate = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    const numericValue = Number(value);
    return Number.isNaN(numericValue) ? String(value) : numericValue.toFixed(6);
  };

  return (
    <section className="panel-grid single admin-stack">
      <article className="panel site-page-panel">
        <div className="panel-header-row site-page-header">
          <div>
            <h2>Manage Sites</h2>
            <p className="muted-text">Organise your patrol network with site boundaries, coordinates, and location names.</p>
          </div>
          <button className="btn btn-primary site-add-button" type="button" onClick={() => setShowModal(true)}>
            <FiPlus size={16} style={{ strokeWidth: 3 }} />
            Add Site
          </button>
        </div>

        <div className="admin-toolbar-row site-toolbar-row">
          <div className="site-summary">
            <span className="site-summary-label">Total Sites</span>
            <strong>{sites.length}</strong>
          </div>

          <div className="site-search-wrap">
            <FiSearch className="site-search-icon" size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="site-search"
              placeholder="Search site name, location, or organisation..."
              aria-label="Search sites"
            />
          </div>
        </div>

        {error ? <p className="inline-feedback inline-feedback-error">{error}</p> : null}
        {status ? <p className="inline-feedback inline-feedback-success">{status}</p> : null}

        {showModal ? (
          <Modal title="Add Operational Site" onClose={() => setShowModal(false)}>
            <form className="admin-form-grid site-form-grid" onSubmit={handleSubmit}>
              <label>
                Site Name
                <input name="name" value={form.name} onChange={handleChange} required placeholder="e.g. Headquarters East" />
              </label>
              <label>
                Location Name
                <input name="location_name" value={form.location_name} onChange={handleChange} required placeholder="e.g. Industrial Area Block C" />
              </label>
              <label>
                  Latitude
                  <input name="latitude" type="number" step="any" value={form.latitude} onChange={handleChange} required placeholder="-4.036729" />
              </label>
              <label>
                  Longitude
                  <input name="longitude" type="number" step="any" value={form.longitude} onChange={handleChange} required placeholder="39.658149" />
              </label>
              <div className="admin-form-actions site-form-actions">
                <button className="btn btn-primary site-add-button" type="submit" disabled={saving}>
                  {saving ? "Saving Node..." : "Initialize Site"}
                </button>
              </div>
            </form>
          </Modal>
        ) : null}

        {selectedSite ? (
          <Modal title={`Site Diagnostics: ${selectedSite.name}`} onClose={() => setSelectedSite(null)}>
            <div className="site-detail-grid site-detail-stack">
              {[
                { label: "Physical Boundary Label", value: selectedSite.location_name, fallback: "Unlabeled Spatial Boundary" },
                { label: "Assigned Security Group", value: selectedSite.organisation_name, fallback: "Global System Infrastructure Pool" },
                { label: "Telemetry Latitude Mapping", value: formatCoordinate(selectedSite.latitude) },
                { label: "Telemetry Longitude Mapping", value: formatCoordinate(selectedSite.longitude) },
                { label: "Internal Node Record Identification Key", value: selectedSite.id }
              ].map((item, idx) => (
                <div key={idx} className="site-detail-item site-detail-row">
                  <span>{item.label}</span>
                  <strong className={idx >= 2 ? "site-detail-mono" : undefined}>{item.value || item.fallback}</strong>
                </div>
              ))}
            </div>
          </Modal>
        ) : null}

        {filteredSites.length ? (
          <div className="site-table-wrap">
            <table className="site-table">
              <thead>
                <tr>
                  {["Site Identity", "Operational Boundary Location", "Organization", "Network Coordinates", ""].map((header, i) => (
                    <th key={i}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSites.map((site) => (
                  <tr key={site.id}>
                    <td className="site-table-name">{site.name}</td>
                    <td>{site.location_name || <em className="site-table-empty">No label</em>}</td>
                    <td>
                      {site.organisation_name ? (
                        <span className="site-org-chip">{site.organisation_name}</span>
                      ) : (
                        <span className="site-table-empty">-</span>
                      )}
                    </td>
                    <td className="site-table-coords">
                      {formatCoordinate(site.latitude)}, {formatCoordinate(site.longitude)}
                    </td>
                    <td className="site-table-actions">
                      <button className="btn btn-secondary site-table-action site-view-button" type="button" onClick={() => setSelectedSite(site)}>
                        <FiEye size={14} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state site-empty-state">
            <p className="site-empty-title">No active sites isolated</p>
            <p className="muted-text">Your search criteria did not match any historical node entries indexed in the registry.</p>
          </div>
        )}
      </article>
    </section>
  );
}