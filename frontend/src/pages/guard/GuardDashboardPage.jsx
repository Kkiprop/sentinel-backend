import { useEffect, useState } from "react";
import { FiActivity, FiAlertTriangle, FiCheckCircle, FiMapPin, FiShield, FiZap } from "react-icons/fi";
import StatCard from "../../components/common/StatCard";
import api from "../../lib/api";
import { endpoints } from "../../lib/endpoints";

export default function GuardDashboardPage() {
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
      <article className="dashboard-hero guard-hero panel">
        <div>
          <p className="dashboard-eyebrow">Field status</p>
          <h2>Stay on route, keep evidence clean, and maintain live patrol confidence.</h2>
          <p className="muted-text">
            Your dashboard shows patrol readiness, scan quality, and the signals that matter before the next checkpoint.
          </p>
        </div>
        <div className="dashboard-hero-metrics">
          <div>
            <span>Shift state</span>
            <strong>{stats?.active_shift ? "On patrol" : "Awaiting shift start"}</strong>
          </div>
          <div>
            <span>Scan quality</span>
            <strong>{stats?.invalid_patrol_logs ?? 0} issue(s) flagged</strong>
          </div>
        </div>
      </article>

      <div className="dashboard-stat-grid">
        <StatCard
          label="Active Shift"
          value={stats?.active_shift ? "Running" : "Offline"}
          tone={stats?.active_shift ? "success" : "warning"}
          icon={<FiActivity />}
          meta="Live assignment state"
        />
        <StatCard
          label="Patrol Logs"
          value={stats?.total_patrol_logs ?? "—"}
          icon={<FiMapPin />}
          meta="Scans submitted on this account"
        />
        <StatCard
          label="Valid Logs"
          value={stats?.valid_patrol_logs ?? "—"}
          tone="success"
          icon={<FiCheckCircle />}
          meta="Accepted checkpoint scans"
        />
        <StatCard
          label="Invalid Logs"
          value={stats?.invalid_patrol_logs ?? "—"}
          tone="warning"
          icon={<FiAlertTriangle />}
          meta="Scans needing correction"
        />
      </div>

      <div className="dashboard-content-grid">
        <article className="panel dashboard-panel">
          <div className="dashboard-panel-header">
            <h3>Live Activity</h3>
            <span className="dashboard-chip"><FiZap /> Field ops</span>
          </div>
          {error ? (
            <p className="inline-feedback">{error}</p>
          ) : (
            <div className="dashboard-list">
              <div>
                <strong>Company-scoped updates</strong>
                <p>Dashboard information is refreshed from your company scope and your active shift.</p>
              </div>
              <div>
                <strong>Checkpoint discipline</strong>
                <p>Route validation remains tied to assigned sites and verified checkpoint locations.</p>
              </div>
            </div>
          )}
        </article>

        <article className="panel dashboard-panel">
          <div className="dashboard-panel-header">
            <h3>Field Notes</h3>
            <span className="dashboard-chip"><FiShield /> Guidance</span>
          </div>
          <div className="dashboard-list compact">
            <div>
              <strong>Stay within assigned sites</strong>
              <p>All actions remain scoped to the locations linked to your account.</p>
            </div>
            <div>
              <strong>Use clean scans</strong>
              <p>Checkpoint validation depends on site membership and coordinate accuracy.</p>
            </div>
            <div>
              <strong>Escalate incidents early</strong>
              <p>Open incident handling and patrol compliance feed back into command review.</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
