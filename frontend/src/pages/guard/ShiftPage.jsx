import { useEffect, useState } from "react";
import api from "../../lib/api";
import { endpoints } from "../../lib/endpoints";

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
        if (response.data.length) {
          setSelectedSiteId(response.data[0].id);
        }
      })
      .catch(() => setError("Could not load assigned sites."));
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
      await api.post(endpoints.patrols.startShift, {
        site_id: selectedSiteId,
        latitude,
        longitude,
      });
      setMessage("Shift started successfully.");
    } catch (startError) {
      setMessage(startError.message || "Unable to start shift.");
    } finally {
      setBusy(false);
    }
  };

  const endShift = async () => {
    setBusy(true);
    setMessage("");

    try {
      const { latitude, longitude } = await getLocation();
      await api.post(endpoints.patrols.endShift, {
        latitude,
        longitude,
      });
      setMessage("Shift ended successfully.");
    } catch (endError) {
      setMessage(endError.message || "Unable to end shift.");
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
