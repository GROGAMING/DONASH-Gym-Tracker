"use client";

import { useCallback, useEffect, useMemo, useState, type FC } from "react";
import { useRouter } from "next/navigation";
import { Trophy } from "lucide-react";

import AppShell from "@/components/AppShell";
import BackButton from "@/components/BackButton";
import MetQuotaTick from "@/components/MetQuotaTick";
import { mondayWeekStartISO } from "@/lib/week";
import { supabase } from "@/lib/supabaseClient";

type Row = { name: string; count: number };

type TabKey = "weekly" | "alltime";

const RANK_STYLES: Record<number, { bg: string; text: string; border: string; badge: string }> = {
  1: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    badge: "bg-amber-400 text-white",
  },
  2: {
    bg: "bg-slate-50",
    text: "text-slate-500",
    border: "border-slate-200",
    badge: "bg-slate-400 text-white",
  },
  3: {
    bg: "bg-orange-50",
    text: "text-orange-600",
    border: "border-orange-200",
    badge: "bg-orange-400 text-white",
  },
};

function initialsFromName(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function rankLabel(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `${rank}`;
}

const LeaderRow: FC<{ entry: Row; rank: number; showQuotaTick: boolean }> = (
  { entry, rank, showQuotaTick }: { entry: Row; rank: number; showQuotaTick: boolean },
) => {
  const isTop = rank <= 3;
  const style = isTop ? RANK_STYLES[rank] : null;
  const initials = initialsFromName(entry.name);

  return (
    <div
      className={
        "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all " +
        (isTop ? `${style!.bg} ${style!.border} shadow-card` : "bg-card border-border")
      }
    >
      <div
        className={
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-display font-bold text-sm " +
          (isTop ? style!.badge : "bg-muted text-muted-foreground")
        }
      >
        {rankLabel(rank)}
      </div>

      <div className={"w-9 h-9 rounded-full flex items-center justify-center shrink-0 " + (isTop ? "bg-primary" : "bg-secondary")}>
        <span className={"font-display font-bold text-xs " + (isTop ? "text-primary-foreground" : "text-foreground")}>{initials}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className={"text-sm font-semibold truncate " + (isTop ? style!.text : "text-foreground")}>
          {entry.name}
        </p>
      </div>

      <div className="text-right shrink-0">
        <span className={"font-display font-bold text-base " + (isTop ? style!.text : "text-foreground")}>
          {entry.count}
        </span>
        <p className="text-[10px] text-muted-foreground leading-none mt-0.5">sessions</p>
        {showQuotaTick && <MetQuotaTick weeklyCount={entry.count} />}
      </div>
    </div>
  );
};

export default function LeaderboardScreen({ teamName }: { teamName: string }) {
  const router = useRouter();
  const weekStart = useMemo(() => mondayWeekStartISO(new Date()), []);

  const [tab, setTab] = useState<TabKey>("weekly");
  const [weekly, setWeekly] = useState<Row[]>([]);
  const [overall, setOverall] = useState<Row[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    (async () => {
      setStatus("");

      const [w, o, playersRes] = await Promise.all([
        supabase.rpc("get_leaderboard_week", { p_week_start: weekStart }),
        supabase.rpc("get_leaderboard_overall"),
        fetch("/api/players"),
      ]);

      if (w.error) return setStatus(w.error.message);
      if (o.error) return setStatus(o.error.message);
      if (!playersRes.ok) {
        const body = (await playersRes.json().catch(() => null)) as { error?: string } | null;
        return setStatus(body?.error || "Failed to load players.");
      }

      const weeklyData = (w.data ?? []) as Row[];
      const overallData = (o.data ?? []) as Row[];
      const players = (await playersRes.json()) as Array<{ id: string; name: string }>;
      const allUsers = players.map((p) => ({ name: p.name }));

      const weeklyMap = new Map(weeklyData.map((r) => [r.name, r.count]));
      const weeklyWithAll = allUsers
        .map((u) => ({ name: u.name, count: weeklyMap.get(u.name) ?? 0 }))
        .sort((a, b) => b.count - a.count);

      const overallMap = new Map(overallData.map((r) => [r.name, r.count]));
      const overallWithAll = allUsers
        .map((u) => ({ name: u.name, count: overallMap.get(u.name) ?? 0 }))
        .sort((a, b) => b.count - a.count);

      setWeekly(weeklyWithAll);
      setOverall(overallWithAll);
    })();
  }, [weekStart]);

  const onBack = useCallback(() => {
    router.push("/");
  }, [router]);

  const data = tab === "weekly" ? weekly : overall;

  return (
    <AppShell teamName={teamName}>
      <div className="max-w-sm mx-auto px-4 pt-5 pb-4 animate-fade-up">
        <div className="mb-4">
          <BackButton onClick={onBack} />
        </div>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shadow-button">
            <Trophy className="w-4.5 h-4.5 text-accent-foreground" strokeWidth={2} />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-xl text-foreground leading-tight">Leaderboard</h2>
            {tab === "weekly" ? (
              <p className="text-xs text-muted-foreground">Week starting {weekStart}</p>
            ) : (
              <p className="text-xs text-muted-foreground">All-time sessions</p>
            )}
          </div>
        </div>

        <div className="flex bg-secondary rounded-xl p-1 mb-5">
          {([
            ["weekly", "Weekly"],
            ["alltime", "All-time"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={
                "flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 " +
                (tab === key ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground")
              }
            >
              {label}
            </button>
          ))}
        </div>

        {status && <p className="text-sm text-destructive mb-4">{status}</p>}

        <div className="flex flex-col gap-2">
          {data.map((entry: Row, idx: number) => (
            <LeaderRow key={entry.name} entry={entry} rank={idx + 1} showQuotaTick={tab === "weekly"} />
          ))}
        </div>

        <div className="py-6 text-center">
          <p className="text-xs text-muted-foreground/60">{data.length} athletes ranked</p>
        </div>
      </div>
    </AppShell>
  );
}
