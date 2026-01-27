"use client";

import { useState } from "react";

export default function AdminLogin() {
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");

  async function login() {
    setMsg("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pw })
    });

    if (!res.ok) setMsg("Wrong password.");
    else window.location.href = "/admin";
  }

  return (
    <main style={{ padding: 20, maxWidth: 520, margin: "0 auto", fontFamily: "system-ui" }}>
      <h2>Admin login</h2>
      <input
        type="password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        placeholder="Password"
        style={{ width: "100%", padding: 10, margin: "8px 0 12px" }}
      />
      <button onClick={login} style={{ padding: "10px 14px" }}>Login</button>
      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </main>
  );
}
