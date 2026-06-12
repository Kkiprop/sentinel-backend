import { useEffect, useState } from "react";
import { FiActivity, FiAlertTriangle, FiCheckCircle, FiAlertCircle, FiUsers, FiUserCheck, FiShield, FiMapPin } from "react-icons/fi";
import StatCard from "../../components/common/StatCard";
import ActiveShiftsTable from "../../components/common/ActiveShiftsTable";
import api from "../../lib/api";
import { endpoints } from "../../lib/endpoints";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [activeShiftsCount, setActiveShiftsCount] = useState(0);
  const [incidentCount, setIncidentCount] = useState(0);
  const [userCounts, setUserCounts] = useState({ guards: 0, supervisors: 0, admins: 0 });
  const [checkpointCount, setCheckpointCount] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    // 1. Fetch patrol dashboard stats (e.g., valid/invalid logs)
    api
      .get(endpoints.patrols.dashboard)
      .then((response) => setStats(response.data))
      .catch(() => setError("Unable to load dashboard stats."));

    // 2. Fetch shifts using relative routing paths
    api
      .get("/api/patrols/manage/shifts/")
      .then((response) => {
        const shifts = response.data || [];
        const activeShifts = shifts.filter(shift => shift.status === "active");
        setActiveShiftsCount(activeShifts.length);
      })
      .catch(() => setError("Unable to load shift metrics."));

    // 3. Fetch reported incidents count relatively
    api
      .get("/api/patrols/incidents/")
      .then((response) => {
        const totalIncidents = response.data?.count ?? response.data?.results?.length ?? 0;
        setIncidentCount(totalIncidents);
      })
      .catch(() => setError("Unable to load incident metrics."));

    // 4. Fetch user roster profiles relatively
    api
      .get("/api/auth/users/")
      .then((response) => {
        const users = response.data || [];
        const counts = users.reduce(
          (acc, user) => {
            if (user.role === "guard") acc.guards++;
            else if (user.role === "supervisor") acc.supervisors++;
            else if (user.role === "admin") acc.admins++;
            return acc;
          },
          { guards: 0, supervisors: 0, admins: 0 }
        );
        setUserCounts(counts);
      })
      .catch(() => setError("Unable to load user metrics."));

    // 5. Fetch checkpoint locations relatively
    api
      .get("/api/patrols/manage/checkpoints/")
      .then((response) => {
        const checkpoints = response.data || [];
        setCheckpointCount(checkpoints.length);
      })
      .catch(() => setError("Unable to load checkpoints metric."));
  }, []);

  return (
    <section className="dashboard-shell">
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="dashboard-stat-grid">
        {/* --- shift stats --- */}
        <StatCard
          label="Active Shifts"
          value={activeShiftsCount}
          tone={activeShiftsCount > 0 ? "success" : "warning"}
          icon={<FiActivity />}
          meta={activeShiftsCount > 0 ? `${activeShiftsCount} live guard networks` : "No active shifts found"}
        />

        {/* --- reported incidents stats --- */}
        <StatCard
          label="Reported Incidents"
          value={incidentCount}
          tone={incidentCount > 0 ? "danger" : "default"}
          icon={<FiAlertCircle />}
          meta="Total filed field exceptions"
        />

        {/* --- user stats --- */}
        <StatCard
          label="Total Guards"
          value={userCounts.guards}
          tone="default"
          icon={<FiUsers />}
          meta="Active personnel on roster"
        />
        <StatCard
          label="Supervisors"
          value={userCounts.supervisors}
          tone="default"
          icon={<FiUserCheck />}
          meta="Field management accounts"
        />
        <StatCard
          label="System Admins"
          value={userCounts.admins}
          tone="default"
          icon={<FiShield />}
          meta="Command control access"
        />

        {/* --- checkpoint stats --- */}
        <StatCard
          label="Total Checkpoints"
          value={checkpointCount}
          tone="default"
          icon={<FiMapPin />}
          meta="Registered NFC/QR tags"
        />
      </div>

      {/* --- active shifts component execution --- */}
      <ActiveShiftsTable />
    </section>
  );
}