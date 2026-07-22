import { useEffect, useRef, useState, useCallback } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { FiSearch, FiMapPin, FiNavigation } from "react-icons/fi";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export default function MapPicker({ latitude, longitude, onChange }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const flyToLocation = useCallback((lat, lng, zoom = 15) => {
    if (!mapRef.current) return;
    mapRef.current.flyTo([lat, lng], zoom, { duration: 1.2 });
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]).addTo(mapRef.current);
    }
    onChange({ latitude: lat, longitude: lng });
  }, [onChange]);

  const handleSearchInput = (event) => {
    const value = event.target.value;
    setSearchQuery(value);
    setSearchError("");

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({
          q: value.trim(),
          format: "json",
          limit: "6",
          addressdetails: "1",
        });
        const response = await fetch(`${NOMINATIM_URL}?${params}`, {
          headers: { "Accept-Language": "en" },
        });
        const data = await response.json();
        setSuggestions(data || []);
        setShowSuggestions(data?.length > 0);
      } catch {
        setSearchError("Search lookup failed. Try a different term.");
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const selectSuggestion = (suggestion) => {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);
    setSearchQuery(suggestion.display_name);
    setShowSuggestions(false);
    setSuggestions([]);
    flyToLocation(lat, lng);
  };

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) {
      return;
    }

    const map = L.map(mapContainer.current, {
      center: latitude != null && longitude != null ? [latitude, longitude] : [0, 0],
      zoom: latitude != null && longitude != null ? 13 : 2,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const marker = L.marker([latitude || 0, longitude || 0]);
    markerRef.current = marker;

    if (latitude != null && longitude != null) {
      marker.addTo(map);
    }

    map.on("click", (event) => {
      const { lat, lng } = event.latlng;
      marker.setLatLng([lat, lng]).addTo(map);
      onChange({ latitude: lat, longitude: lng });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [latitude, longitude, onChange]);

  useEffect(() => {
    if (!mapRef.current || latitude == null || longitude == null) {
      return;
    }

    mapRef.current.setView([latitude, longitude], 13);
    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]).addTo(mapRef.current);
    }
  }, [latitude, longitude]);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Search Bar Overlay */}
      <div style={{
        position: "absolute",
        top: "10px",
        left: "10px",
        right: "10px",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          background: "#ffffff",
          border: "1px solid #cbd5e1",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          padding: "0 12px",
          gap: "8px",
        }}>
          <FiSearch size={16} color="#94a3b8" style={{ flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchInput}
            placeholder="Search for a location (e.g. Mombasa, Nairobi)..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              padding: "10px 0",
              fontSize: "0.875rem",
              color: "#0f172a",
              background: "transparent",
              minWidth: 0,
            }}
          />
          {searching && (
            <span style={{ fontSize: "0.75rem", color: "#94a3b8", flexShrink: 0 }}>Searching...</span>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            maxHeight: "240px",
            overflowY: "auto",
          }}>
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => selectSuggestion(suggestion)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  width: "100%",
                  padding: "10px 12px",
                  border: "none",
                  borderBottom: index < suggestions.length - 1 ? "1px solid #f1f5f9" : "none",
                  background: "#ffffff",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: "0.8125rem",
                  color: "#334155",
                  transition: "background 0.1s",
                }}
                onMouseOver={(e) => e.currentTarget.style.background = "#f8fafc"}
                onMouseOut={(e) => e.currentTarget.style.background = "#ffffff"}
              >
                <FiMapPin size={14} color="#64748b" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
                  <span style={{ fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {suggestion.display_name}
                  </span>
                  <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                    {parseFloat(suggestion.lat).toFixed(4)}, {parseFloat(suggestion.lon).toFixed(4)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {searchError && (
          <div style={{
            padding: "8px 12px",
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: "6px",
            fontSize: "0.75rem",
            color: "#991b1b",
            fontWeight: 500,
          }}>
            {searchError}
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="map-container" ref={mapContainer} style={{ width: "100%", height: "400px" }} />
    </div>
  );
}
