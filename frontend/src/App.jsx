import { Navigate, Route, Routes } from "react-router-dom";
import { FiHome, FiMap, FiMapPin, FiClock, FiShield, FiAlertTriangle, FiUsers, FiTarget, FiBriefcase } from "react-icons/fi";
import PortalShell from "./components/layout/PortalShell";
import GuardShell from "./components/layout/GuardShell.jsx";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import GuardHomePage from "./pages/guard/GuardHomePage";
import GuardDashboardPage from "./pages/guard/GuardDashboardPage";
import GuardAnalyticsPage from "./pages/guard/GuardAnalyticsPage";
import GuardProfilePage from "./pages/guard/GuardProfilePage";
import ShiftPage from "./pages/guard/ShiftPage";
import CheckpointsPage from "./pages/guard/CheckpointsPage";
import IncidentsPage from "./pages/guard/IncidentsPage";
import GuardTeamPage from "./pages/guard/GuardTeamPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import ManageSitesPage from "./pages/admin/ManageSitesPage";
import ManageTrackingPage from "./pages/admin/ManageTrackingPage";
import ManageShiftsPage from "./pages/admin/ManageShiftsPage";
import ManageGuardsPage from "./pages/admin/ManageGuardsPage";
import ManageHRPage from "./pages/admin/ManageHRPage";
import ManageIncidentsPage from "./pages/admin/ManageIncidentsPage";
import ManageVisitorsPage from "./pages/admin/ManageVisitorsPage";
import ManageCheckpointsPage from "./pages/admin/ManageCheckpointsPage";
import { RequireAuth, useAuth } from "./contexts/AuthContext.jsx";

const guardLinks = [
  { to: "/guard", label: "Home", icon: <FiHome size={20} /> },
  { to: "/guard/analytics", label: "Analytics", icon: <FiMapPin size={20} /> },
  { to: "/guard/profile", label: "Profile", icon: <FiUsers size={20} /> },
];

const adminLinks = [
  { to: "/admin", label: "Dashboard", end: true, icon: <FiHome size={18} /> },
  { to: "/admin/tracking", label: "Tracking", icon: <FiMap size={18} /> },
  { to: "/admin/sites", label: "Sites", icon: <FiMapPin size={18} /> },
  { to: "/admin/checkpoints", label: "Checkpoints", icon: <FiTarget size={18} /> },
  { to: "/admin/shifts", label: "Shifts", icon: <FiClock size={18} /> },
  { to: "/admin/guards", label: "Guards", icon: <FiShield size={18} /> },
  { to: "/admin/hr", label: "HR", icon: <FiBriefcase size={18} /> },
  { to: "/admin/visitors", label: "Visitors", icon: <FiUsers size={18} /> },
  { to: "/admin/incidents", label: "Incidents", icon: <FiAlertTriangle size={18} /> }
];

function GuardPortal() {
  return (
    <GuardShell
      // title="Guard Ops"
      links={guardLinks}
    >
      <Routes>
        <Route index element={<GuardHomePage />} />
        <Route path="analytics" element={<GuardDashboardPage />} />
        <Route path="my-shift" element={<GuardAnalyticsPage />} />
        <Route path="profile" element={<GuardProfilePage />} />
        <Route path="shift" element={<ShiftPage />} />
        <Route path="checkpoints" element={<CheckpointsPage />} />
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="team" element={<GuardTeamPage />} />
      </Routes>
    </GuardShell>
  );
}

function AdminPortal() {
  return (
    <PortalShell
      title="Admin Command"
      // subtitle="Manage sites, guards, shifts, and critical incidents in real time."
      links={adminLinks}
    >
      <Routes>
        <Route index element={<AdminDashboardPage />} />
        <Route path="tracking" element={<ManageTrackingPage />} />
        <Route path="sites" element={<ManageSitesPage />} />
        <Route path="checkpoints" element={<ManageCheckpointsPage />} />
        <Route path="shifts" element={<ManageShiftsPage />} />
        <Route path="guards" element={<ManageGuardsPage />} />
        <Route path="hr" element={<ManageHRPage />} />
        <Route path="visitors" element={<ManageVisitorsPage />} />
        <Route path="incidents" element={<ManageIncidentsPage />} />
      </Routes>
    </PortalShell>
  );
}

export default function App() {
  const auth = useAuth();

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          auth.isAuthenticated ? (
            <Navigate to={auth.user?.role === "admin" ? "/admin" : "/guard"} replace />
          ) : (
            <LoginPage />
          )
        }
      />
      <Route
        path="/guard/*"
        element={
          <RequireAuth>
            <GuardPortal />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/*"
        element={
          <RequireAuth>
            <AdminPortal />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
