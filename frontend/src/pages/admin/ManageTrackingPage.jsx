import { useEffect, useRef, useState } from "react";
import * as L from "leaflet";
import { FiMap } from "react-icons/fi";
import "leaflet/dist/leaflet.css";
import api from "../../lib/api";
import { endpoints } from "../../lib/endpoints";

// Custom SVG Icon pin generation with explicit dynamic structural name labels
const createCustomIcon = (color, labelText = "") => {
  return L.divIcon({
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 32px; height: 32px;">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="${color}" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.3));">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3" fill="#ffffff"></circle>
        </svg>
        ${labelText ? `
          <div style="
            position: absolute; 
            top: -16px; 
            background: ${color}; 
            color: #ffffff; 
            font-size: 10px; 
            font-weight: 700; 
            padding: 2px 6px; 
            border-radius: 4px; 
            border: 1px solid #ffffff; 
            white-space: nowrap; 
            max-width: 100px;
            overflow: hidden;
            text-overflow: ellipsis;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          " title="${labelText}">
            ${labelText}
          </div>
        ` : ""}
      </div>
    `,
    className: "custom-map-marker-pin",
    iconSize: [32, 42],
    iconAnchor: [16, 32], 
    popupAnchor: [0, -32],
  });
};

export default function ManageTrackingPage() {
  const [checkpoints, setCheckpoints] = useState([]);
  const [baseCheckpoints, setBaseCheckpoints] = useState([]);
  const [sites, setSites] = useState([]);
  const [filterSiteId, setFilterSiteId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [invalidCheckpoints, setInvalidCheckpoints] = useState([]);

  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markerLayer = useRef(null);

  const handleFocusCheckpoint = (lat, lng) => {
    if (!mapRef.current || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    mapRef.current.setView([lat, lng], 16, { animate: true, duration: 1 });
  };

  // 1. Load foundational items
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [sitesResponse, baseCheckpointsResponse] = await Promise.all([
          api.get(endpoints.patrols.sites),
          api.get("/api/patrols/manage/checkpoints/")
        ]);

        const siteItems = sitesResponse.data.results || sitesResponse.data;
        const baseItems = baseCheckpointsResponse.data.results || baseCheckpointsResponse.data;

        setSites(siteItems);
        setBaseCheckpoints(baseItems);
      } catch {
        setError("Unable to load foundational layout data.");
      }
    };
    loadInitialData();
  }, []);

  // 2. Fetch runtime checkpoints on selection filter adjustments
  useEffect(() => {
    let active = true;
    
    const loadCheckpoints = async () => {
      setLoading(true);
      try {
        const response = await api.get(endpoints.patrols.adminCheckpoints, {
          params: filterSiteId ? { site_id: filterSiteId } : {},
        });
        
        if (!active) return;

        const checkpointItems = response.data.results || response.data;
        setCheckpoints(checkpointItems);
        setError("");
      } catch {
        if (active) setError("Unable to load checkpoint tracking data.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadCheckpoints();

    return () => {
      active = false;
    };
  }, [filterSiteId]);

  // 3. Initialize Leaflet Map Instance
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = L.map(mapContainer.current, {
      center: [-4.036729, 39.658149],
      zoom: 12,
      minZoom: 2,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    markerLayer.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setMapReady(true);

    setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 100);

    return () => {
      map.remove();
      mapRef.current = null;
      markerLayer.current = null;
      setMapReady(false);
    };
  }, []);

  // 4. Marker Painting Layer Logic
  useEffect(() => {
    if (!mapReady || !mapRef.current || !markerLayer.current) return;

    mapRef.current.invalidateSize();
    markerLayer.current.clearLayers();

    const bounds = [];
    const invalidItems = [];

    // Layer A: Plot broad infrastructure foundation frames (Muted Grey Icon Marker)
    baseCheckpoints.forEach((checkpoint) => {
      const lat = Number(checkpoint.latitude);
      const lng = Number(checkpoint.longitude);
      const hasValidCoordinates = Number.isFinite(lat)
        && Number.isFinite(lng)
        && lat >= -90 && lat <= 90
        && lng >= -180 && lng <= 180;
        
      if (!hasValidCoordinates) {
        invalidItems.push(checkpoint);
        return;
      }

      const isFiltered = checkpoints.some(c => String(c.id) === String(checkpoint.id));
      if (isFiltered && filterSiteId) return;

      const baseMarker = L.marker([lat, lng], {
        icon: createCustomIcon("#9ca3af")
      });

      baseMarker.bindPopup(`<strong>${checkpoint.name} (Global Infrastructure)</strong>`);
      baseMarker.addTo(markerLayer.current);
    });

    // Layer B: Plot filtered active route map locations (High-contrast Blue with Checkpoint Name Label)
    if (checkpoints.length > 0) {
      checkpoints.forEach((checkpoint) => {
        const lat = Number(checkpoint.latitude);
        const lng = Number(checkpoint.longitude);
        const hasValidCoordinates = Number.isFinite(lat)
          && Number.isFinite(lng)
          && lat >= -90 && lat <= 90
          && lng >= -180 && lng <= 180;
          
        if (!hasValidCoordinates) {
          invalidItems.push(checkpoint);
          return;
        }

        // Swapped `Step ${checkpoint.order}` logic out for structural field name reference
        const dynamicMarker = L.marker([lat, lng], {
          icon: createCustomIcon("#2563eb", checkpoint.name)
        });

        dynamicMarker.bindPopup(
          `<strong>${checkpoint.name}</strong><br/>${checkpoint.site_name || `Site ${checkpoint.site}`}<br/>Order Step: ${checkpoint.order}`
        );
        
        dynamicMarker.addTo(markerLayer.current);
        bounds.push([lat, lng]);
      });

      if (bounds.length === 1) {
        mapRef.current.setView(bounds[0], 14);
      } else if (bounds.length > 1) {
        mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    } else if (baseCheckpoints.length > 0 && !filterSiteId) {
      const globalBounds = baseCheckpoints
        .map((checkpoint) => [Number(checkpoint.latitude), Number(checkpoint.longitude)])
        .filter((boundsPair) => 
          Number.isFinite(boundsPair[0]) && Number.isFinite(boundsPair[1]) &&
          boundsPair[0] >= -90 && boundsPair[0] <= 90 &&
          boundsPair[1] >= -180 && boundsPair[1] <= 180
        );
        
      if (globalBounds.length > 0) {
        mapRef.current.fitBounds(globalBounds, { padding: [40, 40], maxZoom: 12 });
      }
    }

    setInvalidCheckpoints(
      invalidItems.filter((checkpoint, index, self) => self.findIndex((item) => item.id === checkpoint.id) === index)
    );
  }, [checkpoints, baseCheckpoints, mapReady, filterSiteId]);

  return (
    <section className="panel-grid single admin-stack" style={{ fontFamily: "system-ui, sans-serif" }}>
      <article className="panel" style={{ border: "none", boxShadow: "none", background: "transparent" }}>
        
        {/* Navigation Control Area Header */}
        <div className="panel-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#111827", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}><FiMap/> Checkpoint Operations Tracking</h2>
          </div>
          <div className="field-group" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <select 
              className="site-select" 
              value={filterSiteId} 
              onChange={(event) => setFilterSiteId(event.target.value)}
              style={{ padding: "0.5rem 2rem 0.5rem 1rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", background: "#fff", fontWeight: "500", color: "#374151", cursor: "pointer" }}
            >
              <option value="">All Operational Sites</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Workspace Display Wrapper Grid Split */}
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "1.5rem", minHeight: "550px", width: "100%" }}>
          
          {/* Dynamic Sidebar Control Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", background: "#fff", borderRadius: "0.5rem", border: "1px solid #e5e7eb", padding: "1rem", maxHeight: "600px", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f3f4f6", paddingBottom: "0.5rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: "600", color: "#111827", margin: 0 }}>Active Route Points</h3>
              <span style={{ fontSize: "0.75rem", background: filterSiteId ? "#dbeafe" : "#f3f4f6", color: filterSiteId ? "#1e40af" : "#4b5563", padding: "0.125rem 0.5rem", borderRadius: "1rem", fontWeight: "600" }}>
                {checkpoints.length} Nodes
              </span>
            </div>

            {loading ? (
              <p style={{ color: "#6b7280", fontSize: "0.875rem", textAlign: "center", margin: "auto 0" }}>Syncing hardware positions...</p>
            ) : checkpoints.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {checkpoints.map((checkpoint) => (
                  <button
                    key={checkpoint.id}
                    onClick={() => handleFocusCheckpoint(Number(checkpoint.latitude), Number(checkpoint.longitude))}
                    style={{ display: "flex", flexDirection: "column", textAlign: "left", width: "100%", padding: "0.75rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "0.375rem", cursor: "pointer", transition: "all 0.2s" }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.background = "#f0fdf4"; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#f8fafc"; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", width: "100%", marginBottom: "0.25rem" }}>
                      <span style={{ fontWeight: "600", color: "#1e293b", fontSize: "0.875rem" }}>{checkpoint.name}</span>
                      <span style={{ fontSize: "0.75rem", background: "#3b82f6", color: "#fff", padding: "0.125rem 0.375rem", borderRadius: "0.25rem", fontWeight: "700" }}>
                        #{checkpoint.order}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      {checkpoint.site_name || `Site Space ID: ${checkpoint.site}`}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ margin: "auto 0", textAlign: "center", color: "#94a3b8", padding: "1rem" }}>
                <p style={{ fontSize: "0.875rem", margin: 0 }}>No dynamic site route isolated.</p>
                <p style={{ fontSize: "0.75rem", marginTop: "0.25rem", margin: 0 }}>Displaying broad infrastructure grid markers.</p>
              </div>
            )}
          </div>

          {/* Interactive Map Visualizer Panel Workspace */}
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div 
              ref={mapContainer} 
              style={{ flex: 1, width: "100%", minHeight: "550px", borderRadius: "0.5rem", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }} 
            />
          </div>
        </div>

        {/* Invalid Configuration Data Tray (Footer Section Warnings) */}
        {invalidCheckpoints.length ? (
          <article style={{ marginTop: "1.5rem", padding: "1rem", background: "#fafafa", borderRadius: "0.5rem", border: "1px solid #e5e7eb" }}>
            <h4 style={{ fontSize: "0.875rem", fontWeight: "600", color: "#991b1b", margin: "0 0 0.5rem 0" }}>System Warning: Malformed Hardware Coordinates</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "0.5rem" }}>
              {invalidCheckpoints.map((checkpoint) => (
                <div key={checkpoint.id} style={{ fontSize: "0.75rem", padding: "0.5rem", background: "#fff", border: "1px solid #fca5a5", borderRadius: "0.25rem", color: "#7f1d1d" }}>
                  <strong>{checkpoint.name}</strong> <br />
                  <span style={{ fontFamily: "monospace", color: "#dc2626" }}>Lat: {String(checkpoint.latitude)} / Lng: {String(checkpoint.longitude)}</span>
                </div>
              ))}
            </div>
          </article>
        ) : null}

      </article>
    </section>
  );
}