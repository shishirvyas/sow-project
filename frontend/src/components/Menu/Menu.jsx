// src/components/Menu/Menu.jsx
import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import "./Menu.css";

const links = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
];

export default function Menu() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu when route changes
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Close mobile menu automatically if window resized to desktop size
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 768 && open) setOpen(false);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [open]);

  return (
    <nav className="site-nav" aria-label="Main navigation">
      {/* Brand / Title */}
      <div className="nav-brand">
        <span className="brand-title">SKOPE360</span>
      </div>

      {/* Desktop menu (visible at >= 769px) */}
      <ul className="nav-links">
        {links.map((l) => (
          <li key={l.to}>
            <NavLink
              to={l.to}
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              {l.label}
            </NavLink>
          </li>
        ))}
      </ul>

      {/* Hamburger button for mobile */}
      <button
        className="hamburger"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
      >
        {/* simple accessible icon */}
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
          <path
            d={
              open
                ? "M6 18L18 6M6 6l12 12" // X (close)
                : "M3 6h18M3 12h18M3 18h18" // hamburger
            }
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </button>

      {/* Mobile overlay menu */}
      <div className={`mobile-menu ${open ? "open" : ""}`} role="dialog" aria-modal="true">
        <ul>
          {links.map((l) => (
            <li key={l.to}>
              <NavLink
                to={l.to}
                className={({ isActive }) =>
                  isActive ? "mobile-link active" : "mobile-link"
                }
                onClick={() => setOpen(false)}
              >
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      {/* semi-transparent backdrop when mobile menu open */}
      <div
        className={`backdrop ${open ? "visible" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />
    </nav>
  );
}
