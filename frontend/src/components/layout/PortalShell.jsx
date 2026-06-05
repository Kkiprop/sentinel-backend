import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FiSun, FiMoon, FiUser, FiLogOut } from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext.jsx";

export default function PortalShell({ title, subtitle, links, children }) {
  const navigate = useNavigate();
  const auth = useAuth();
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

  return (
    <div className="portal-shell">
      <aside className="portal-sidebar">
        <p className="portal-kicker">SYSTEM ONLINE</p>
        <h1>{title}</h1>
        <p className="portal-subtitle">{subtitle}</p>
        <nav className="portal-nav">
          {links.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `portal-link ${isActive ? "active" : ""}`}
              end={item.end}
            >
              {item.icon ? <span className="portal-link-icon" aria-hidden="true">{item.icon}</span> : null}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="portal-main">
        <div className="portal-topbar">
          <div className="portal-topbar-title">
            <h2>{title}</h2>
            <p>{subtitle}</p>
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
        {children}
      </main>
    </div>
  );
}
