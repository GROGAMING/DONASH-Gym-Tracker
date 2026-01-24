"use client";

import { useState } from "react";
import Link from "next/link";

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "fixed", top: 12, left: 12, zIndex: 1000 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "#fff",
          border: "1px solid #ccc",
          borderRadius: 4,
          padding: "6px 10px",
          cursor: "pointer",
          fontSize: 16
        }}
      >
        {open ? "✕" : "☰"}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 4,
            background: "#fff",
            border: "1px solid #ccc",
            borderRadius: 4,
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            minWidth: 140
          }}
        >
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            <li>
              <Link
                href="/upload"
                onClick={() => setOpen(false)}
                style={{
                  display: "block",
                  padding: "8px 12px",
                  textDecoration: "none",
                  color: "#000"
                }}
              >
                Upload
              </Link>
            </li>
            <li>
              <Link
                href="/leaderboard"
                onClick={() => setOpen(false)}
                style={{
                  display: "block",
                  padding: "8px 12px",
                  textDecoration: "none",
                  color: "#000"
                }}
              >
                Leaderboard
              </Link>
            </li>
            <li>
              <Link
                href="/doom-scroll"
                onClick={() => setOpen(false)}
                style={{
                  display: "block",
                  padding: "8px 12px",
                  textDecoration: "none",
                  color: "#000"
                }}
              >
                Doom Scroll
              </Link>
            </li>
            <li>
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                style={{
                  display: "block",
                  padding: "8px 12px",
                  textDecoration: "none",
                  color: "#000"
                }}
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
