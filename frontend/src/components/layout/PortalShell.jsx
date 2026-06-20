import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FiMenu, FiSun, FiMoon, FiUser, FiLogOut } from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext.jsx";

export default function PortalShell({ title, subtitle, links, children }) {
  const navigate = useNavigate();
  const auth = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    return window.localStorage.getItem("theme") || "dark";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  const handleLogout = () => {
    auth.logout();
    navigate("/login", { replace: true });
  };

  const closeSidebar = () => setSidebarOpen(false);
  const toggleSidebar = () => setSidebarOpen((current) => !current);

  return (
    <div 
      className="portal-shell"
      style={{
        display: "flex",
        height: "100vh",       // Locks layout wrapper strictly to viewport height
        width: "100vw",
        overflow: "hidden",     // Disables full-page window global scrolling
      }}
    >
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}
      
      <aside 
        className={`portal-sidebar ${sidebarOpen ? "open" : ""}`}
        style={{
          height: "100vh",
          overflowY: "auto",    // Links container inside sidebar can still scroll if needed
          flexShrink: 0,        // Ensures sidebar width remains uncompressed
        }}
      >
        <p className="portal-kicker">SYSTEM ONLINE</p>
        <h1>{title}</h1>
        <p className="portal-subtitle">{subtitle}</p>
        <nav className="portal-nav">
          {links.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeSidebar}
              className={({ isActive }) => `portal-link ${isActive ? "active" : ""}`}
              end={item.end}
            >
              {item.icon ? <span className="portal-link-icon" aria-hidden="true">{item.icon}</span> : null}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main 
        className="portal-main"
        style={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",   // Prevents topbar and content combined from stretching parent
        }}
      >
        {/* Stuck Top Header Panel Block */}
        <div 
          className="portal-topbar"
          style={{
            flexShrink: 0,      // Keeps topbar at its precise design design height
          }}
        >
          <div className="portal-topbar-left">
            <button
              className="icon-button menu-toggle"
              type="button"
              onClick={toggleSidebar}
              aria-label="Toggle navigation"
              aria-expanded={sidebarOpen}
            >
              <FiMenu size={18} />
            </button>
            <div className="portal-topbar-title">
              <h2>{title}</h2>
              <p>{subtitle}</p>
            </div>
          </div>
          <div className="portal-topbar-actions">
            <button className="icon-button" type="button" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "dark" ? <FiSun size={18} /> : <FiMoon size={18} />}
            </button>
            <button className="icon-button" type="button" aria-label="Logout" onClick={handleLogout}>
              <FiLogOut size={18} />
            </button>
          </div>
        </div>

        {/* Isolated Viewport Active Page Content Container */}
        <div
          style={{
            flexGrow: 1,
            overflowY: "auto",  // Active view layout page absorbs full inner scrolling action
            padding: "1.5rem",   // Retains spacing baseline
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}