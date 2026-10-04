import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { API_BASE_URL, getHealth } from "../services/api";

const LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/projects", label: "Projects" },
  { to: "/test-cases", label: "Test Cases" },
  { to: "/defects", label: "Defects" },
  { to: "/reports", label: "Reports" },
];

const TITLES = {
  "/dashboard": "Dashboard",
  "/projects": "Projects",
  "/test-cases": "Test Cases",
  "/defects": "Defects",
  "/reports": "Reports",
};

export default function Layout() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState(API_BASE_URL ? "checking" : "missing");

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!API_BASE_URL) return undefined;
    let active = true;
    getHealth()
      .then(() => {
        if (active) setApiStatus("ok");
      })
      .catch(() => {
        if (active) setApiStatus("down");
      });
    return () => {
      active = false;
    };
  }, [location.pathname]);

  const title = TITLES[location.pathname] || "QA Workspace";

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            QA
          </span>
          <div>
            <strong>QA Track</strong>
            <p>Test & defect workspace</p>
          </div>
        </div>
        <nav aria-label="Primary">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      {menuOpen ? <button type="button" className="sidebar-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} /> : null}
      <div className="workspace">
        <header className="topbar">
          <button
            type="button"
            className="menu-button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            Menu
          </button>
          <div>
            <p className="eyebrow">QA Test Management</p>
            <h1>{title}</h1>
          </div>
          <p className={`api-status status-${apiStatus}`}>
            {apiStatus === "ok" && "API connected"}
            {apiStatus === "checking" && "Checking API"}
            {apiStatus === "down" && "API offline"}
            {apiStatus === "missing" && "API URL missing"}
          </p>
        </header>
        <main id="main-content">
          {apiStatus === "missing" ? (
            <div className="alert" role="alert">
              Set VITE_API_URL to your deployed backend address, then rebuild the frontend.
            </div>
          ) : null}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
