"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { mondayWeekStartISO } from "@/lib/week";
import MetWeeklyQuota from "@/components/MetWeeklyQuota";

type Row = { name: string; count: number };
type QuotaData = { requiredSessions: number; users: { name: string; metQuota: boolean }[] };

export default function LeaderboardPage() {
  const weekStart = useMemo(() => mondayWeekStartISO(new Date()), []);
  const [weekly, setWeekly] = useState<Row[]>([]);
  const [overall, setOverall] = useState<Row[]>([]);
  const [quotaData, setQuotaData] = useState<QuotaData | null>(null);
  const [status, setStatus] = useState("");


  useEffect(() => {
    (async () => {
      setStatus("");

      const w = await supabase.rpc("get_leaderboard_week", { p_week_start: weekStart });
      const o = await supabase.rpc("get_leaderboard_overall");

      if (w.error) return setStatus(w.error.message);
      if (o.error) return setStatus(o.error.message);

      setWeekly((w.data ?? []) as Row[]);
      setOverall((o.data ?? []) as Row[]);

      // Fetch quota data for badges
      try {
        const quotaRes = await fetch("/api/weekly-quota");
        if (quotaRes.ok) {
          const quotaResult = await quotaRes.json();
          setQuotaData({
            requiredSessions: quotaResult.requiredSessions,
            users: quotaResult.users
          });
        }
      } catch (error) {
        console.error("Failed to fetch quota data:", error);
      }
    })();
  }, [weekStart]);

  // Helper to check if user met quota
  const getMetQuota = (userName: string): boolean => {
    if (!quotaData) return false;
    const user = quotaData.users.find(u => u.name === userName);
    return user?.metQuota || false;
  };

  return (
    <main style={{ padding: 20, maxWidth: 520, margin: "0 auto", fontFamily: "system-ui" }}>
      <h2>Leaderboards</h2>

      <MetWeeklyQuota />

      <h3>This week (starting {weekStart})</h3>
      <p style={{ fontSize: "14px", color: "#666", marginBottom: "12px" }}>
        Required: {quotaData?.requiredSessions || 3} sessions
      </p>
      <ol>
        {weekly.map((r) => (
          <li key={r.name}>
            {r.name}: {r.count} {getMetQuota(r.name) ? "✅" : ""}
          </li>
        ))}
      </ol>

      <h3>Overall</h3>
      <ol>
        {overall.map((r) => (
          <li key={r.name}>{r.name}: {r.count}</li>
        ))}
      </ol>

      {status && <p>{status}</p>}
    </main>
  );
}
