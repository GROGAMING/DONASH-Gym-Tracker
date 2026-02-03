"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { mondayWeekStartISO } from "@/lib/week";
import QuotaDisplay from "@/components/QuotaDisplay";
import { getWeeklyRequiredSessions } from "@/lib/weeklyQuotaSimple";

type Row = { name: string; count: number; weeklySessionCount: number };
type QuotaUser = { id: string; name: string; weeklySessionCount: number; };

export default function LeaderboardPage() {
  const weekStart = useMemo(() => mondayWeekStartISO(new Date()), []);
  const [weekly, setWeekly] = useState<Row[]>([]);
  const [overall, setOverall] = useState<Row[]>([]);
  const [quotaUsers, setQuotaUsers] = useState<QuotaUser[]>([]);
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
          setQuotaUsers(quotaResult.users || []);
        }
      } catch (error) {
        console.error("Failed to fetch quota data:", error);
      }
    })();
  }, [weekStart]);

  // Helper to check if user met quota
  const getMetQuota = (userName: string): boolean => {
    if (!quotaUsers) return false;
    const user = quotaUsers.find(u => u.name === userName);
    const count = user?.weeklySessionCount ?? 0;
    const required = getWeeklyRequiredSessions();
    return count >= required;
  };

  return (
    <main style={{ padding: 20, maxWidth: 520, margin: "0 auto", fontFamily: "system-ui" }}>
      <h2>Leaderboards</h2>

      <QuotaDisplay 
        users={quotaUsers.map(u => ({ 
          ...u, 
          weeklySessionCount: u.weeklySessionCount ?? 0,
          metQuota: getMetQuota(u.name) 
        }))}
        weekStart={weekStart}
        showMetOnly={true}
      />

      <h3>This week (starting {weekStart})</h3>
      <QuotaDisplay 
        users={quotaUsers.map(u => ({ 
          ...u, 
          weeklySessionCount: u.weeklySessionCount ?? 0,
          metQuota: getMetQuota(u.name) 
        }))}
        weekStart={weekStart}
        showMetOnly={false}
      />

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
