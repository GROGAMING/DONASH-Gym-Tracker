"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { mondayWeekStartISO } from "@/lib/week";
import MetQuotaTick from "@/components/MetQuotaTick";

type Row = { name: string; count: number };

export default function LeaderboardPage() {
  const weekStart = useMemo(() => mondayWeekStartISO(new Date()), []);
  const [weekly, setWeekly] = useState<Row[]>([]);
  const [overall, setOverall] = useState<Row[]>([]);
  const [users, setUsers] = useState<{ name: string }[]>([]);
  const [status, setStatus] = useState("");


  useEffect(() => {
    (async () => {
      setStatus("");

      const [w, o, u] = await Promise.all([
        supabase.rpc("get_leaderboard_week", { p_week_start: weekStart }),
        supabase.rpc("get_leaderboard_overall"),
        supabase.from("users").select("name").order("name")
      ]);

      if (w.error) return setStatus(w.error.message);
      if (o.error) return setStatus(o.error.message);
      if (u.error) return setStatus(u.error.message);

      const weeklyData = (w.data ?? []) as Row[];
      const overallData = (o.data ?? []) as Row[];
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
    })();
  }, [weekStart]);

  return (
    <main style={{ padding: 20, maxWidth: 520, margin: "0 auto", fontFamily: "system-ui" }}>
      <h2>Leaderboards</h2>

      <h3>This week (starting {weekStart})</h3>
      <ol>
        {weekly.map((r) => (
          <li key={r.name}>
            {r.name}: {r.count}
            <MetQuotaTick weeklyCount={r.count} />
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
