import { useEffect, useState } from "react";
import { FiActivity, FiAlertTriangle, FiCheckCircle, FiClock, FiMap, FiShield } from "react-icons/fi";
import StatCard from "../../components/common/StatCard";
import api from "../../lib/api";
import { endpoints } from "../../lib/endpoints";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(endpoints.patrols.dashboard)
      .then((response) => setStats(response.data))
      .catch(() => setError("Unable to load dashboard stats."));
  }, []);

  return (
    <section className="dashboard-shell">
      <article className="dashboard-hero panel">
        <div>
          <p className="dashboard-eyebrow">Operations overview</p>
          <h2>Command visibility across sites, shifts, and patrol compliance.</h2>
          <p className="muted-text">
            Monitor company-wide patrol movement, track compliance health, and focus attention where operational risk is rising.
          </p>
        </div>
        <div className="dashboard-hero-metrics">
          <div>
            <span>Coverage status</span>
            <strong>{stats?.active_shift ? "Live patrols active" : "No active patrols"}</strong>
          </div>
          <div>
            <span>Verified activity</span>
            <strong>{stats?.valid_patrol_logs ?? 0} accepted scans</strong>
          </div>
        </div>
      </article>

      <div className="dashboard-stat-grid">
        <StatCard
          label="Active Shift"
          value={stats?.active_shift ? "Live" : "Idle"}
          tone={stats?.active_shift ? "success" : "warning"}
          icon={<FiActivity />}
          meta="Current patrol network status"
        />
        <StatCard
          label="Total Patrol Logs"
          value={stats?.total_patrol_logs ?? "—"}
          icon={<FiMap />}
          meta="All checkpoint scans recorded"
        />
        <StatCard
          label="Valid Logs"
          value={stats?.valid_patrol_logs ?? "—"}
          tone="success"
          icon={<FiCheckCircle />}
          meta="Verified scans within policy"
        />
        <StatCard
          label="Invalid Logs"
          value={stats?.invalid_patrol_logs ?? "—"}
          tone="danger"
          icon={<FiAlertTriangle />}
          meta="Exceptions needing review"
        />
      </div>

      <div className="dashboard-content-grid">
        <article className="panel dashboard-panel">
          <div className="dashboard-panel-header">
            <h3>Operations Snapshot</h3>
            <span className="dashboard-chip"><FiShield /> Admin scope</span>
          </div>
          {error ? (
            <p className="inline-feedback">{error}</p>
          ) : (
            <div className="dashboard-list">
              <div>
                <strong>Patrol health</strong>
                <p>Company activity is summarized from active shifts and checkpoint logs in real time.</p>
              </div>
              <div>
                <strong>Response readiness</strong>
                <p>Use incident and invalid log counts to see where supervision should focus first.</p>
              </div>
            </div>
          )}
        </article>

        <article className="panel dashboard-panel">
          <div className="dashboard-panel-header">
            <h3>Priority Queue</h3>
            <span className="dashboard-chip"><FiClock /> Today</span>
          </div>
          <div className="dashboard-list compact">
            <div>
              <strong>Review active site patrols</strong>
              <p>Confirm high-risk sites have coverage and movement remains visible in tracking.</p>
            </div>
            <div>
              <strong>Validate incident evidence</strong>
              <p>Inspect uploaded media and close items with complete reports.</p>
            </div>
            <div>
              <strong>Approve access changes</strong>
              <p>Keep guard assignments and operational permissions aligned with live work.</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
