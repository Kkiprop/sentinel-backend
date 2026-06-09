import { useState } from "react";
import { NavLink } from "react-router-dom";
import { FiMenu, FiX, FiBell } from "react-icons/fi";

export default function GuardShell({ title = "Guard Tour", subtitle = "Patrol operations", links, children }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a", display: "flex", flexDirection: "column" }}>
      <style>{`
        .guard-bottom-nav { display: flex; }
        @media (max-width: 768px) { .guard-bottom-nav { display: none; } }
      `}</style>

      <header style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "rgba(255,255,255,0.96)",
        padding: "0.85rem 1rem",
        borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
        boxShadow: "0 15px 40px rgba(15, 23, 42, 0.08)",
        backdropFilter: "blur(18px)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div style={{ width: "2.4rem", height: "2.4rem", borderRadius: "0.85rem", background: "#e0f2fe", display: "grid", placeItems: "center", color: "#0369a1", fontWeight: 700, fontSize: "0.95rem" }}>
            G
          </div>
          <div>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, lineHeight: 1 }}>{title}</div>
            <div style={{ fontSize: "0.76rem", color: "#64748b" }}>{subtitle}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            style={{
              border: "none",
              background: "#f8fafc",
              width: "2.6rem",
              height: "2.6rem",
              borderRadius: "0.85rem",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              position: "relative",
              color: "#475569"
            }}
            aria-label="Notifications"
          >
            <FiBell size={18} />
            <span style={{
              position: "absolute",
              top: "0.55rem",
              right: "0.55rem",
              width: "0.5rem",
              height: "0.5rem",
              borderRadius: "50%",
              background: "#ef4444",
              boxShadow: "0 0 0 2px #ffffff"
            }} />
          </button>

          <button
            onClick={() => setMenuOpen((open) => !open)}
            style={{ border: "none", background: "#f8fafc", width: "2.6rem", height: "2.6rem", borderRadius: "0.85rem", display: "grid", placeItems: "center", cursor: "pointer", color: "#0f172a" }}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>
      </header>

      {menuOpen && (
        <div style={{ position: "fixed", inset: "56px 0 0 0", backgroundColor: "rgba(15, 23, 42, 0.35)", zIndex: 40, overflowY: "auto" }}>
          <div style={{ backgroundColor: "#ffffff", minHeight: "100%", padding: "1rem", display: "grid", gap: "0.5rem" }}>
            {links.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                style={({ isActive }) => ({
                  textDecoration: "none",
                  padding: "0.95rem 1rem",
                  borderRadius: "0.85rem",
                  backgroundColor: isActive ? "#eff6ff" : "#f8fafc",
                  color: "#0f172a",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  fontWeight: 600,
                })}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}

      <main style={{ flex: 1, paddingTop: "4.5rem", paddingBottom: "5rem", display: "flex", flexDirection: "column", minHeight: "calc(100vh - 4.5rem)" }}>
        {children}
      </main>

      <nav className="guard-bottom-nav" style={{ position: "fixed", inset: "auto 0 0 0", borderTop: "1px solid #e2e8f0", background: "#ffffff", display: "flex", justifyContent: "space-around", alignItems: "center", padding: "0.75rem 0", boxShadow: "0 -1px 10px rgba(15, 23, 42, 0.08)" }}>
        {links.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              textDecoration: "none",
              color: isActive ? "#0f172a" : "#64748b",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.25rem",
              fontSize: "0.75rem",
            })}
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
