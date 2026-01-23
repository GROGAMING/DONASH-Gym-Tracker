"use client";

import { useMemo, useState } from "react";
import { mondayFromAnyDateISO } from "@/lib/week";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminReportPage() {
  const [dateInWeek, setDateInWeek] = useState(todayISO());
  const weekStart = useMemo(() => mondayFromAnyDateISO(dateInWeek), [dateInWeek]);

  return (
    <main style={{ padding: 20, maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}>
      <h2>Weekly PDF report</h2>

      <label>Pick any date in the week</label>
      <input
        type="date"
        value={dateInWeek}
        onChange={(e) => setDateInWeek(e.target.value)}
        style={{ display: "block", width: "100%", padding: 10, margin: "8px 0 16px" }}
      />

      <p>Week start: <b>{weekStart}</b></p>

      <a
        href={`/api/admin/report?weekStart=${weekStart}`}
        style={{ display: "inline-block", padding: "10px 14px", border: "1px solid #ddd" }}
      >
        Download PDF
      </a>
    </main>
  );
}
