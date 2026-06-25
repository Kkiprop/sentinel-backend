import { useEffect, useState } from "react";
import api from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import {
  enqueueOfflineAction,
  loadCachedSites,
  saveCachedSites,
  loadOfflineShiftState,
  saveOfflineShiftState,
  isOnline,
  isNetworkError,
} from "../../lib/offline.js";

export default function ShiftPage() {
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(endpoints.patrols.sites)
      .then((response) => {
        setSites(response.data);
        saveCachedSites(response.data);
        if (response.data.length) {
          setSelectedSiteId(response.data[0].id);
        }
      })
      .catch(() => {
        const cached = loadCachedSites();
        if (cached.length) {
          setSites(cached);
          setSelectedSiteId(cached[0].id);
          setError("Offline: showing cached assigned sites.");
        } else {
          setError("Could not load assigned sites.");
        }
      });
  }, []);

  const getLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not available."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        () => reject(new Error("Location permission denied.")),
        { enableHighAccuracy: true }
      );
    });

  const startShift = async () => {
    if (!selectedSiteId) {
      setMessage("Please select a site before starting your shift.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const { latitude, longitude } = await getLocation();
      const payload = {
        site_id: selectedSiteId,
        latitude,
        longitude,
        created_at: new Date().toISOString(),
        client_id: `shift-start-${Date.now()}`,
      };
      await api.post(endpoints.patrols.startShift, payload);
      saveOfflineShiftState({ active: true, siteId: selectedSiteId, latitude, longitude, startedAt: payload.created_at });
      setMessage("Shift started successfully.");
    } catch (startError) {
      if (!isOnline() || isNetworkError(startError)) {
        const payload = {
          site_id: selectedSiteId,
          latitude: null,
          longitude: null,
          created_at: new Date().toISOString(),
          client_id: `shift-start-${Date.now()}`,
        };
        enqueueOfflineAction({
          endpoint: endpoints.patrols.startShift,
          payload,
          category: "shift",
          type: "start",
          method: "post",
        });
        saveOfflineShiftState({ active: true, siteId: selectedSiteId, latitude: null, longitude: null, startedAt: payload.created_at });
        setMessage("Offline: shift start queued locally.");
      } else {
        setMessage(startError.message || "Unable to start shift.");
      }
    } finally {
      setBusy(false);
    }
  };

  const endShift = async () => {
    setBusy(true);
    setMessage("");

    try {
      const { latitude, longitude } = await getLocation();
      const payload = {
        latitude,
        longitude,
        created_at: new Date().toISOString(),
        client_id: `shift-end-${Date.now()}`,
      };
      await api.post(endpoints.patrols.endShift, payload);
      saveOfflineShiftState({ active: false, endedAt: payload.created_at });
      setMessage("Shift ended successfully.");
    } catch (endError) {
      if (!isOnline() || isNetworkError(endError)) {
        const payload = {
          latitude: null,
          longitude: null,
          created_at: new Date().toISOString(),
          client_id: `shift-end-${Date.now()}`,
        };
        enqueueOfflineAction({
          endpoint: endpoints.patrols.endShift,
          payload,
          category: "shift",
          type: "end",
          method: "post",
        });
        saveOfflineShiftState({ active: false, endedAt: payload.created_at });
        setMessage("Offline: shift end queued locally.");
      } else {
        setMessage(endError.message || "Unable to end shift.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel-grid single">
      <article className="panel">
        <h2>Shift Control</h2>
        <p>Select your assigned site, then start or end your patrol shift.</p>

        {error ? <p className="form-error">{error}</p> : null}

        <label>
          Assigned Site
          <select
            value={selectedSiteId}
            onChange={(event) => setSelectedSiteId(event.target.value)}
            className="site-select"
          >
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name} — {site.location_name}
              </option>
            ))}
          </select>
        </label>

        <div className="inline-actions">
          <button className="btn btn-primary" disabled={busy} onClick={startShift}>
            Start Shift
          </button>
          <button className="btn btn-secondary" disabled={busy} onClick={endShift}>
            End Shift
          </button>
        </div>

        {message ? <p className="inline-feedback">{message}</p> : null}
      </article>
    </section>
  );
}
