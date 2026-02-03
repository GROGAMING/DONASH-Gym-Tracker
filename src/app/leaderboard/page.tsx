"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { mondayWeekStartISO } from "@/lib/week";
import MetQuotaTick from "@/components/MetQuotaTick";

type Row = { name: string; count: number; };

export default function LeaderboardPage() {
  const weekStart = useMemo(() => mondayWeekStartISO(new Date()), []);
  const [weekly, setWeekly] = useState<Row[]>([]);
  const [overall, setOverall] = useState<Row[]>([]);
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

      {status && <p>{status}</p>
    </main>
  );
}
