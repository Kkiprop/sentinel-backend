import { useState } from "react";
import { NavLink } from "react-router-dom";
import { FiMenu, FiX, FiBell, FiUser, FiChevronRight } from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext.jsx"; // Importing to populate user card data

export default function GuardShell({ title = "Guard Tour", subtitle = "Patrol operations", links, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();

  const userEmail = user?.email || "guard@dakada.com";
  const initials = userEmail.substring(0, 2).toUpperCase();

  return (
    <div 
      style={{ 
        minHeight: "100vh", 
        maxHeight: "100vh", 
        background: "#f8fafc", 
        color: "#0f172a", 
        display: "flex", 
        flexDirection: "column",
        overflow: "hidden" 
      }}
    >
      <style>{`
        .guard-bottom-nav { display: none; }
        @media (max-width: 768px) { 
          .guard-bottom-nav { display: flex; } 
        }
        .native-scroll-container {
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        
        /* Drawer animation transitions */
        .drawer-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(4px);
          z-index: 100;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.25s ease, visibility 0.25s ease;
        }
        .drawer-backdrop.open {
          opacity: 1;
          visibility: visible;
        }
        .sidebar-drawer {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 280px;
          background: #ffffff;
          z-index: 101;
          box-shadow: 5px 0 25px rgba(15,23,42,0.15);
          display: flex;
          flex-direction: column;
          transform: translateX(-100%);
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .sidebar-drawer.open {
          transform: translateX(0);
        }
      `}</style>

      {/* Header Container */}
      <header style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#ffffff", 
        padding: "0.85rem 1rem",
        borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
        boxShadow: "0 4px 20px rgba(15, 23, 42, 0.02)",
        height: "56px",
        boxSizing: "border-box"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          {/* Burger icon menu control triggers left-side slideout */}
          <button
            onClick={() => setMenuOpen(true)}
            style={{ border: "none", background: "transparent", padding: 0, width: "2.4rem", height: "2.4rem", display: "grid", placeItems: "center", cursor: "pointer", color: "#0f172a" }}
            aria-label="Open sidebar menu"
          >
            <FiMenu size={22} />
          </button>
          
          <div>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, lineHeight: 1 }}>{title}</div>
            <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: "0.15rem" }}>{subtitle}</div>
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
        </div>
      </header>

      {/* --- Native Fluid Slide Drawer Menu Layout --- */}
      <div 
        className={`drawer-backdrop ${menuOpen ? "open" : ""}`} 
        onClick={() => setMenuOpen(false)} 
      />
      
      <aside className={`sidebar-drawer ${menuOpen ? "open" : ""}`}>
        {/* Drawer Profile Header block */}
        <div style={{ padding: "2rem 1.25rem 1.5rem", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", color: "#ffffff", position: "relative" }}>
          <button 
            onClick={() => setMenuOpen(false)}
            style={{ position: "absolute", top: "1rem", right: "1rem", border: "none", background: "rgba(255,255,255,0.1)", width: "2rem", height: "2rem", borderRadius: "50%", display: "grid", placeItems: "center", color: "#ffffff", cursor: "pointer" }}
          >
            <FiX size={16} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.5rem" }}>
            <div style={{ width: "3rem", height: "3rem", borderRadius: "50%", background: "#2563eb", display: "grid", placeItems: "center", fontWeight: 700, fontSize: "1.1rem", color: "#fff", boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}>
              {initials}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {userEmail.split("@")[0]}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.15rem" }}>
                <FiUser size={12} /> Active Duty Patrol
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Action Routes List */}
        <div style={{ flex: 1, padding: "1rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.35rem", overflowY: "auto" }}>
          {links.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              style={({ isActive }) => ({
                textDecoration: "none",
                padding: "0.85rem 1rem",
                borderRadius: "0.75rem",
                backgroundColor: isActive ? "#f0f6ff" : "transparent",
                color: isActive ? "#2563eb" : "#334155",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontWeight: isActive ? 700 : 600,
                fontSize: "0.9rem",
                transition: "background 0.15s ease"
              })}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                <span style={{ display: "flex", opacity: 0.85 }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              <FiChevronRight size={14} style={{ opacity: 0.35 }} />
            </NavLink>
          ))}
        </div>

        {/* Subtle Brand Footer inside sidebar */}
        <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid #f1f5f9", fontSize: "0.7rem", color: "#94a3b8", fontWeight: 500, backgroundColor: "#fafafa" }}>
          v2.4.0 • Secured Patrol Shell
        </div>
      </aside>

      {/* Main Screen Content View */}
      <main 
        className="native-scroll-container"
        style={{ 
          flex: 1, 
          paddingTop: "4.5rem", 
          paddingBottom: "5.5rem", 
          display: "flex", 
          flexDirection: "column", 
          boxSizing: "border-box" 
        }}
      >
        {children}
      </main>

      {/* Mobile Bottom Navigation Dock */}
      <nav className="guard-bottom-nav" style={{ position: "fixed", inset: "auto 0 0 0", zIndex: 30, borderTop: "1px solid #e2e8f0", background: "#ffffff", justifyContent: "space-around", alignItems: "center", padding: "0.75rem 0", boxShadow: "0 -2px 12px rgba(15, 23, 42, 0.03)" }}>
        {links.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              textDecoration: "none",
              color: isActive ? "#2563eb" : "#64748b",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.25rem",
              fontSize: "0.75rem",
              fontWeight: isActive ? 700 : 500
            })}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}