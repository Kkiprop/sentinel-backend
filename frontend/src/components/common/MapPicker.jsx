import { useEffect, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export default function MapPicker({ latitude, longitude, onChange }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

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

  return <div className="map-container" ref={mapContainer} />;
}
