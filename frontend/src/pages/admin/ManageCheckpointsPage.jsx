import { useEffect, useRef, useState } from "react";
import { FiPlus, FiMapPin, FiMap, FiList, FiCheckCircle, FiAlertCircle, FiEye } from "react-icons/fi";
import api from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import Modal from "../../components/common/Modal.jsx";
import MapPicker from "../../components/common/MapPicker.jsx";

const initialForm = {
  name: "",
  site: "",
  latitude: "",
  longitude: "",
  order: "",
};

export default function ManageCheckpointsPage() {
  const [checkpoints, setCheckpoints] = useState([]);
  const [sites, setSites] = useState([]);
  const [filterSiteId, setFilterSiteId] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const currentLocationButton = useRef(null);

  const loadData = async (siteId = "") => {
    try {
      const checkpointResponse = await api.get(endpoints.patrols.adminCheckpoints, {
        params: siteId ? { site_id: siteId } : {},
      });
      const siteResponse = await api.get(endpoints.patrols.sites);
      const checkpointItems = checkpointResponse.data.results || checkpointResponse.data;
      const siteItems = siteResponse.data.results || siteResponse.data;
      
      setCheckpoints(checkpointItems);
      setSites(siteItems);
      
      if (!form.site && siteItems.length) {
        setForm((prev) => ({ ...prev, site: String(siteItems[0].id) }));
      }
      setError("");
    } catch {
      setError("Unable to load checkpoint telemetry data.");
    }
  };

  useEffect(() => {
    loadData(filterSiteId);
  }, [filterSiteId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterChange = (event) => {
    setFilterSiteId(event.target.value);
  };

  const handleUseCurrentLocation = () => {
    setLocationMessage("");
    if (!navigator.geolocation) {
      setLocationMessage("Geolocation framework is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude.toFixed(6);
        const longitude = position.coords.longitude.toFixed(6);
        setForm((prev) => ({ ...prev, latitude: String(latitude), longitude: String(longitude) }));
        setLocationMessage("Device hardware telemetry coordinates applied.");
        setShowMapPicker(false);
      },
      () => {
        setLocationMessage("Unable to safely poll device location metrics.");
      },
      { enableHighAccuracy: true }
    );
  };

  const handleMapLocation = (coords) => {
    setForm((prev) => ({
      ...prev,
      latitude: coords.latitude.toFixed(6),
      longitude: coords.longitude.toFixed(6),
    }));
    setLocationMessage("Coordinates pinpointed from map engine visual canvas.");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus("");

    try {
      await api.post(endpoints.patrols.adminCheckpoints, {
        name: form.name,
        site: Number(form.site),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        order: Number(form.order),
      });
      setForm({ ...initialForm, site: form.site });
      setShowModal(false);
      setStatus("Operational checkpoint registered successfully.");
      await loadData(filterSiteId);
    } catch (requestError) {
      setStatus(requestError?.response?.data?.detail || "Failed to commit checkpoint structure updates.");
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

  const inlineLocationActionButtonStyles = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    padding: "0.5rem 1rem",
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "0.375rem",
    fontSize: "0.8125rem",
    fontWeight: "600",
    color: "#334155",
    cursor: "pointer",
    flex: "1",
    transition: "all 0.15s ease",
  };

  return (
    <section style={{ fontFamily: "system-ui, sans-serif", background: "#f8fafc", padding: "1.75rem", borderRadius: "0.75rem" }}>
      <article style={{ background: "#ffffff", borderRadius: "0.5rem", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.01)" }}>
        
        {/* Core Tactical Navigation Header Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap", gap: "1.25rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>Manage Checkpoints</h2>
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.25rem", margin: 0 }}>Instantiate patrol verification targets assigned to guarded tracking grids.</p>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <select 
                value={filterSiteId} 
                onChange={handleFilterChange}
                style={{ padding: "0.55rem 2rem 0.55rem 1rem", borderRadius: "0.375rem", border: "1px solid #cbd5e1", background: "#ffffff", fontSize: "0.875rem", fontWeight: "600", color: "#334155", cursor: "pointer" }}
              >
                <option value="">All Regions / Sites</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </div>
            
            <button 
              type="button" 
              onClick={() => { setLocationMessage(""); setShowModal(true); }}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1.125rem", background: "#00E699", color: "#091e14", border: "none", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: "700", cursor: "pointer", transition: "background 0.2s", boxShadow: "0 2px 4px rgba(0, 230, 153, 0.15)" }}
              onMouseOver={(e) => e.currentTarget.style.background = "#00cc85"}
              onMouseOut={(e) => e.currentTarget.style.background = "#00E699"}
            >
              <FiPlus size={16} style={{ strokeWidth: 3 }} />
              Add Checkpoint
            </button>
          </div>
        </div>

        {/* Real-time Event System Warning Messages */}
        {error ? <div style={{ margin: "1rem 1.5rem 0 1.5rem", padding: "0.75rem 1rem", background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: "500" }}>{error}</div> : null}
        {status ? <div style={{ margin: "1rem 1.5rem 0 1.5rem", padding: "0.75rem 1rem", background: status.includes("successfully") ? "#f0fdf4" : "#fef2f2", color: status.includes("successfully") ? "#166534" : "#991b1b", border: status.includes("successfully") ? "1px solid #bbf7d0" : "1px solid #fca5a5", borderRadius: "0.375rem", fontSize: "0.875rem", fontWeight: "500" }}>{status}</div> : null}

        {/* Add Checkpoint Overlay Dialog Form */}
        {showModal ? (
          <Modal title="Add Node Checkpoint" onClose={() => { setShowModal(false); setShowMapPicker(false); }}>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "0.5rem" }}>
              
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
                <label style={labelStyles}>
                  Checkpoint Identifier Name
                  <input name="name" value={form.name} onChange={handleChange} required style={inputStyles} placeholder="e.g. Northern Gate Scan A" />
                </label>
                <label style={labelStyles}>
                  Routing Step Index Order
                  <input name="order" type="number" min="1" value={form.order} onChange={handleChange} required style={inputStyles} placeholder="1" />
                </label>
              </div>

              <label style={labelStyles}>
                Assign Parent Security Site Frame
                <select name="site" value={form.site} onChange={handleChange} required style={{ ...inputStyles, cursor: "pointer" }}>
                  <option value="">Choose Site Sector...</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label style={labelStyles}>
                  Latitude
                  <input name="latitude" type="number" step="any" value={form.latitude} onChange={handleChange} required style={inputStyles} placeholder="-4.036729" />
                </label>
                <label style={labelStyles}>
                  Longitude
                  <input name="longitude" type="number" step="any" value={form.longitude} onChange={handleChange} required style={inputStyles} placeholder="39.658149" />
                </label>
              </div>

              {/* Geographic Core Location Engine Selectors */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.25rem" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: "700", color: "#334155" }}>Telemetry Acquisition Source</span>
                <div style={{ display: "flex", gap: "0.75rem", width: "100%" }}>
                  <button 
                    className="btn btn-secondary" 
                    type="button" 
                    onClick={handleUseCurrentLocation} 
                    ref={currentLocationButton}
                    style={inlineLocationActionButtonStyles}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = "#00E699"; e.currentTarget.style.color = "#00cc85"; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.color = "#334155"; }}
                  >
                    <FiMapPin size={14} />
                    Use Current Location
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    type="button" 
                    onClick={() => setShowMapPicker((prev) => !prev)}
                    style={{ ...inlineLocationActionButtonStyles, borderColor: showMapPicker ? "#00E699" : "#cbd5e1", color: showMapPicker ? "#00cc85" : "#334155", background: showMapPicker ? "#f0fdf4" : "#ffffff" }}
                  >
                    <FiMap size={14} />
                    {showMapPicker ? "Close Map Surface" : "Pick from Map"}
                  </button>
                </div>
              </div>

              {/* Live Embedded Workspace Map Picker Drawer */}
              {showMapPicker ? (
                <div style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "0.375rem", overflow: "hidden", padding: "0.25rem", background: "#f8fafc" }}>
                  <MapPicker
                    latitude={form.latitude ? Number(form.latitude) : null}
                    longitude={form.longitude ? Number(form.longitude) : null}
                    onChange={handleMapLocation}
                  />
                </div>
              ) : null}

              {locationMessage ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.75rem", fontWeight: "600", color: locationMessage.includes("applied") || locationMessage.includes("selected") ? "#166534" : "#b45309" }}>
                  {locationMessage.includes("applied") || locationMessage.includes("selected") ? <FiCheckCircle /> : <FiAlertCircle />}
                  {locationMessage}
                </div>
              ) : null}

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.75rem", borderTop: "1px solid #f1f5f9", paddingTop: "1.25rem" }}>
                <button 
                  type="submit" 
                  disabled={saving}
                  style={{ padding: "0.625rem 1.5rem", background: "#00E699", color: "#091e14", border: "none", borderRadius: "0.375rem", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" }}
                  onMouseOver={(e) => e.currentTarget.style.background = "#00cc85"}
                  onMouseOut={(e) => e.currentTarget.style.background = "#00E699"}
                >
                  {saving ? "Deploying Node..." : "Initialize Checkpoint"}
                </button>
              </div>
            </form>
          </Modal>
        ) : null}

        {selectedCheckpoint ? (
          <Modal title={`Checkpoint QR: ${selectedCheckpoint.name}`} onClose={() => setSelectedCheckpoint(null)}>
            <div className="checkpoint-qr-modal">
              <div className="checkpoint-qr-preview">
                {selectedCheckpoint.qr_code_image ? (
                  <img src={selectedCheckpoint.qr_code_image} alt={`QR code for ${selectedCheckpoint.name}`} />
                ) : (
                  <div className="checkpoint-qr-fallback">QR unavailable</div>
                )}
              </div>
              <div className="checkpoint-qr-details">
                <div className="site-detail-item site-detail-row">
                  <span>Payload</span>
                  <strong className="site-detail-mono checkpoint-qr-payload">{selectedCheckpoint.qr_code}</strong>
                </div>
                <div className="site-detail-item site-detail-row">
                  <span>Coordinates</span>
                  <strong className="site-detail-mono">
                    {selectedCheckpoint.latitude ? Number(selectedCheckpoint.latitude).toFixed(6) : "-"}, {selectedCheckpoint.longitude ? Number(selectedCheckpoint.longitude).toFixed(6) : "-"}
                  </strong>
                </div>
                <div className="site-detail-item site-detail-row">
                  <span>Site</span>
                  <strong>{selectedCheckpoint.site_name || `Sector Code Reference: ${selectedCheckpoint.site}`}</strong>
                </div>
                <div className="site-detail-item site-detail-row">
                  <span>Order</span>
                  <strong>Step #{selectedCheckpoint.order}</strong>
                </div>
              </div>
            </div>
          </Modal>
        ) : null}

        {/* Clean Structured Checkpoint Telemetry Grid Table Element Container */}
        {checkpoints.length ? (
          <div style={{ width: "100%", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Step Sequence</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Checkpoint Name / Sector</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Assigned Host Guard Site</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Telemetry Coordinates</th>
                  <th style={{ padding: "0.875rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>QR</th>
                </tr>
              </thead>
              <tbody>
                {checkpoints.map((checkpoint) => (
                  <tr 
                    key={checkpoint.id} 
                    style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                    onMouseOver={(e) => e.currentTarget.style.background = "#fafbfd"}
                    onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "1rem 1.5rem" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.25rem 0.625rem", background: "#f1f5f9", borderRadius: "0.25rem", color: "#1e293b", fontSize: "0.75rem", fontWeight: "700", border: "1px solid #e2e8f0" }}>
                        <FiList size={11} style={{ color: "#64748b" }} />
                        Step #{checkpoint.order}
                      </span>
                    </td>
                    <td style={{ padding: "1rem 1.5rem", fontSize: "0.875rem", fontWeight: "600", color: "#0f172a" }}>{checkpoint.name}</td>
                    <td style={{ padding: "1rem 1.5rem", fontSize: "0.875rem", color: "#475569", fontWeight: "500" }}>
                      {checkpoint.site_name || `Sector Code Reference: ${checkpoint.site}`}
                    </td>
                    <td style={{ padding: "1rem 1.5rem", fontSize: "0.875rem", fontFamily: "monospace", color: "#64748b" }}>
                      {checkpoint.latitude ? Number(checkpoint.latitude).toFixed(6) : "-"}, {checkpoint.longitude ? Number(checkpoint.longitude).toFixed(6) : "-"}
                    </td>
                    <td style={{ padding: "1rem 1.5rem", textAlign: "right" }}>
                      <button className="btn btn-secondary checkpoint-qr-button" type="button" onClick={() => setSelectedCheckpoint(checkpoint)}>
                        <FiEye size={14} />
                        View QR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "5rem 2rem", background: "#ffffff" }}>
            <p style={{ fontSize: "1rem", fontWeight: "600", color: "#0f172a", margin: 0 }}>No check-nodes found</p>
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.35rem", margin: 0 }}>This infrastructure slice possesses no active checkpoint positions linked inside the database registry.</p>
          </div>
        )}
      </article>
    </section>
  );
}