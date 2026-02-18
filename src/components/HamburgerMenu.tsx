"use client";

import { useState } from "react";
import Link from "next/link";

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "fixed", top: 12, left: 12, zIndex: 1000 }}>
      <button
        className="menu-button"
        onClick={() => setOpen(!open)}
      >
        {open ? "✕" : "☰"}
      </button>
      {open && (
        <div className="menu-dropdown">
          <ul className="menu-list">
            <li>
              <Link
                href="/upload"
                onClick={() => setOpen(false)}
                className="menu-link"
              >
                Upload
              </Link>
            </li>
            <li>
              <Link
                href="/leaderboard"
                onClick={() => setOpen(false)}
                className="menu-link"
              >
                Leaderboard
              </Link>
            </li>
            <li>
              <Link
                href="/doom-scroll"
                onClick={() => setOpen(false)}
                className="menu-link"
              >
                Doom Scroll
              </Link>
            </li>
            <li>
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="menu-link"
              >
                Admin
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
