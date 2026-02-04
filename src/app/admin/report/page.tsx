"use client";

export const dynamic = "force-dynamic";

import { useMemo, useState, useEffect, ChangeEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import ReportQuota from "@/components/ReportQuota";

function dublinMondayWeekStartISO(d: Date): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Dublin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(d);

  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));

  const utcMidnight = new Date(Date.UTC(year, month - 1, day));
  const dow = utcMidnight.getUTCDay();
  const mondayOffset = (dow + 6) % 7;
  utcMidnight.setUTCDate(utcMidnight.getUTCDate() - mondayOffset);
  return utcMidnight.toISOString().slice(0, 10);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminReportPage() {
  const [dateInWeek, setDateInWeek] = useState(todayISO());

  const weekStart = useMemo(() => dublinMondayWeekStartISO(new Date(dateInWeek)), [dateInWeek]);

  const [weekly, setWeekly] = useState<{ name: string; count: number }[]>([]);
  const [overall, setOverall] = useState<{ name: string; count: number }[]>([]);
  const [users, setUsers] = useState<{ name: string }[]>([]);
  const [status, setStatus] = useState("");

  const load = async () => {
    setStatus("");
    const [w, o, u] = await Promise.all([
      supabase.rpc("get_leaderboard_week", { p_week_start: weekStart }),
      supabase.rpc("get_leaderboard_overall"),
      supabase.from("users").select("name").order("name")
    ]);

    if (w.error) return setStatus(w.error.message);
    if (o.error) return setStatus(o.error.message);
    if (u.error) return setStatus(u.error.message);

    const weeklyData = (w.data ?? []) as { name: string; count: number }[];
    const overallData = (o.data ?? []) as { name: string; count: number }[];
    const allUsers = (u.data ?? []) as { name: string }[];
    
    setUsers(allUsers);
    
    // Merge weekly data with all users (show 0 for users with no sessions)
    const weeklyMap = new Map(weeklyData.map(r => [r.name, r.count]));
    const weeklyWithAll = allUsers.map(user => ({
      name: user.name,
      count: weeklyMap.get(user.name) ?? 0
    })).sort((a, b) => b.count - a.count);
    
    // Merge overall data with all users (show 0 for users with no sessions)
    const overallMap = new Map(overallData.map(r => [r.name, r.count]));
    const overallWithAll = allUsers.map(user => ({
      name: user.name,
      count: overallMap.get(user.name) ?? 0
    })).sort((a, b) => b.count - a.count);
    
    setWeekly(weeklyWithAll);
    setOverall(overallWithAll);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const ws = sp.get("weekStart");
      if (ws) setDateInWeek(ws);
    }
    load();
  }, []);

  const weeklyMap = new Map(weekly.map((r: { name: string; count: number }) => [r.name, r.count]));
  const met = users.map((u: { name: string }) => u.name).filter((n: string) => (weeklyMap.get(n) ?? 0) >= 2);
  const notMet = users.map((u: { name: string }) => u.name).filter((n: string) => (weeklyMap.get(n) ?? 0) < 2);

  const handleWeekChange = (v: string) => {
    setDateInWeek(v);
    if (typeof window !== "undefined") {
      const u = new URL(window.location.href);
      u.searchParams.set("weekStart", dublinMondayWeekStartISO(new Date(v)));
      window.history.replaceState({}, "", u);
    }
    load();
  };

  return (
    <main style={{ padding: 20, maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}>
      <h2>Weekly Report</h2>

      <label>Pick any date in the week</label>
      <input
        type="date"
        value={dateInWeek}
        onChange={(e: ChangeEvent<HTMLInputElement>) => handleWeekChange(e.target.value)}
        style={{ display: "block", width: "100%", padding: 10, margin: "8px 0 16px" }}
      />

      <p>Week start: <b>{weekStart}</b></p>

      <button
        onClick={() => window.print()}
        style={{ display: "inline-block", padding: "10px 14px", border: "1px solid #ddd", cursor: "pointer" }}
      >
        Print / Save as PDF
      </button>

      {status && <p style={{ color: "red" }}>{status}</p>}

      <div style={{ marginTop: 24 }}>
        <ReportQuota weekly={weekly} overall={overall} users={users} />

        <h3>This week leaderboard</h3>
        <ol>
          {weekly.length === 0 ? (
            <li>No users found.</li>
          ) : (
            weekly.map((r: { name: string; count: number }) => <li key={r.name}>{r.name}: {r.count}</li>)
          )}
        </ol>

        <h3>Overall leaderboard</h3>
        <ol>
          {overall.length === 0 ? (
            <li>No users found.</li>
          ) : (
            overall.map((r: { name: string; count: number }) => <li key={r.name}>{r.name}: {r.count}</li>)
          )}
        </ol>
      </div>

      <style jsx>{`
        @media print {
          button {
            display: none;
          }
          input[type="date"] {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}
