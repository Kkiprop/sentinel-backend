import { useEffect, useState } from "react";
import api from "../../lib/api";
import { endpoints } from "../../lib/endpoints";

export default function GuardTeamPage() {
  const [sites, setSites] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(endpoints.patrols.sites)
      .then((response) => setSites(response.data))
      .catch(() => setError("Unable to load team assignments."));
  }, []);

  return (
    <section className="panel-grid single">
      <article className="panel">
        <h2>Guard Team</h2>
        {error ? (
          <p className="inline-feedback">{error}</p>
        ) : sites.length ? (
          <ul>
            {sites.map((site) => (
              <li key={site.id}>
                {site.name} — {site.location_name}
                {site.guard_ids?.length ? ` (${site.guard_ids.length} guards assigned)` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted-text">No assigned sites available yet.</p>
        )}
      </article>
    </section>
  );
}
