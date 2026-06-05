import { NavLink } from "react-router-dom";

export default function GuardShell({ title, subtitle, links, children }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a", display: "flex", flexDirection: "column" }}>
      <main style={{ flex: 1, padding: "1rem", paddingBottom: "5.5rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>{title}</h1>
          <p style={{ margin: "0.5rem 0 0", color: "#64748b" }}>{subtitle}</p>
        </div>
        {children}
      </main>

      <nav style={{ position: "fixed", inset: "auto 0 0 0", borderTop: "1px solid #e2e8f0", background: "#ffffff", display: "flex", justifyContent: "space-around", alignItems: "center", padding: "0.75rem 0", boxShadow: "0 -1px 10px rgba(15, 23, 42, 0.08)" }}>
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
