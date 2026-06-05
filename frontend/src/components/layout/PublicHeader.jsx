import { Link, NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Platform" },
  { to: "/guard", label: "Guard Ops" },
  { to: "/admin", label: "Admin" }
];

export default function PublicHeader() {
  return (
    <header className="top-nav">
      <Link to="/" className="brand-mark" aria-label="Sentinel home">
        <span className="brand-dot" />
        <span>
          SENTINEL<span className="brand-accent">SYNAPSE</span>
        </span>
      </Link>
      <nav className="top-nav-links">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `top-link ${isActive ? "active" : ""}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <Link to="/login" className="btn btn-primary compact">
        Sign In
      </Link>
    </header>
  );
}
