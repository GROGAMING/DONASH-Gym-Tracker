"use client";

export const dynamic = "force-dynamic";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart2, ChevronDown, ChevronUp, Printer } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type WeekRow = { name: string; count: number };

function dublinMondayWeekStartISO(d: Date): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Dublin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value;
  const utcMidnight = new Date(Date.UTC(Number(get("year")), Number(get("month")) - 1, Number(get("day"))));
  const mondayOffset = (utcMidnight.getUTCDay() + 6) % 7;
  utcMidnight.setUTCDate(utcMidnight.getUTCDate() - mondayOffset);
  return utcMidnight.toISOString().slice(0, 10);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function pct(n: number, total: number) {
  if (total === 0) return 0;
  return Math.round((n / total) * 100);
}

function CollapsibleList({ title, names, defaultOpen = false }: { title: string; names: string[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-card hover:bg-secondary transition-colors"
      >
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{names.length}</span>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <ul className="divide-y divide-border bg-card">
          {names.length === 0 ? (
            <li className="px-5 py-3 text-sm text-muted-foreground">None</li>
          ) : (
            names.map((n) => (
              <li key={n} className="px-5 py-3 text-sm text-foreground">{n}</li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export default function AdminReportPage() {
  const [dateInWeek, setDateInWeek] = useState(todayISO());
  const weekStart = useMemo(() => dublinMondayWeekStartISO(new Date(dateInWeek)), [dateInWeek]);

  const [weekly, setWeekly] = useState<WeekRow[]>([]);
  const [overall, setOverall] = useState<WeekRow[]>([]);
  const [users, setUsers] = useState<{ name: string }[]>([]);
  const [quota, setQuota] = useState(3);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const weekStartRef = useRef(weekStart);
  weekStartRef.current = weekStart;

  const load = useCallback(async (ws: string) => {
    setLoading(true);
    setError("");
    const [w, o, playersRes, settingsRes] = await Promise.all([
      supabase.rpc("get_leaderboard_week", { p_week_start: ws }),
      supabase.rpc("get_leaderboard_overall"),
      fetch("/api/players"),
      fetch("/api/settings"),
    ]);

    if (w.error) { setError(w.error.message); setLoading(false); return; }
    if (o.error) { setError(o.error.message); setLoading(false); return; }
    if (!playersRes.ok) { setError("Failed to load players."); setLoading(false); return; }

    const players = (await playersRes.json()) as Array<{ id: string; name: string }>;

    if (settingsRes.ok) {
      const s = (await settingsRes.json().catch(() => null)) as { value?: number } | null;
      if (typeof s?.value === "number" && s.value >= 1) setQuota(s.value);
    }

    const weeklyData = (w.data ?? []) as WeekRow[];
    const overallData = (o.data ?? []) as WeekRow[];
    const allUsers = players.map((p) => ({ name: p.name }));

    setUsers(allUsers);

    const weeklyMap = new Map(weeklyData.map((r) => [r.name, r.count]));
    setWeekly(
      allUsers
        .map((u) => ({ name: u.name, count: weeklyMap.get(u.name) ?? 0 }))
        .sort((a, b) => b.count - a.count),
    );

    const overallMap = new Map(overallData.map((r) => [r.name, r.count]));
    setOverall(
      allUsers
        .map((u) => ({ name: u.name, count: overallMap.get(u.name) ?? 0 }))
        .sort((a, b) => b.count - a.count),
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ws = new URLSearchParams(window.location.search).get("weekStart");
      if (ws) setDateInWeek(ws);
      void load(ws ?? weekStartRef.current);
    } else {
      void load(weekStart);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleWeekChange = (v: string) => {
    setDateInWeek(v);
    const ws = dublinMondayWeekStartISO(new Date(v));
    if (typeof window !== "undefined") {
      const u = new URL(window.location.href);
      u.searchParams.set("weekStart", ws);
      window.history.replaceState({}, "", u);
    }
    void load(ws);
  };

  // --- Derived stats ---
  const total = users.length;
  const weeklyCountMap = useMemo(() => new Map(weekly.map((r) => [r.name, r.count])), [weekly]);

  const metNames = useMemo(
    () => users.map((u) => u.name).filter((n) => (weeklyCountMap.get(n) ?? 0) >= quota),
    [users, weeklyCountMap, quota],
  );
  const notMetNames = useMemo(
    () => users.map((u) => u.name).filter((n) => (weeklyCountMap.get(n) ?? 0) < quota),
    [users, weeklyCountMap, quota],
  );

  // Breakdown: 0, 1..quota-1, >=quota
  const breakdownBuckets = useMemo(() => {
    const buckets: { label: string; count: number; pctVal: number; highlight?: boolean }[] = [];
    // Met quota
    buckets.push({
      label: `Met weekly quota (${quota})`,
      count: metNames.length,
      pctVal: pct(metNames.length, total),
      highlight: true,
    });
    // Intermediate buckets (only if quota > 1)
    if (quota > 1) {
      for (let s = quota - 1; s >= 1; s--) {
        const cnt = users.filter((u) => (weeklyCountMap.get(u.name) ?? 0) === s).length;
        buckets.push({
          label: `Completed ${s} session${s !== 1 ? "s" : ""}`,
          count: cnt,
          pctVal: pct(cnt, total),
        });
      }
    }
    // 0 sessions
    const zeroCnt = users.filter((u) => (weeklyCountMap.get(u.name) ?? 0) === 0).length;
    buckets.push({
      label: "Completed 0 sessions",
      count: zeroCnt,
      pctVal: pct(zeroCnt, total),
    });
    return buckets;
  }, [metNames.length, notMetNames, quota, total, users, weeklyCountMap]);

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-16">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Admin
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Printer className="w-4 h-4" /> Print / PDF
          </button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center shrink-0">
            <BarChart2 className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-xl text-foreground leading-tight">Weekly Report</h1>
            <p className="text-xs text-muted-foreground">Squad performance summary</p>
          </div>
        </div>

        {/* Week picker */}
        <div className="bg-card border border-border rounded-2xl shadow-card p-4 mb-4 print:hidden">
          <label className="block text-xs font-semibold text-muted-foreground mb-2">Pick any date in the week</label>
          <input
            type="date"
            value={dateInWeek}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleWeekChange(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none"
          />
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-sm text-destructive mb-4">
            {error}
          </div>
        )}

        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Week of", value: weekStart },
            { label: "Quota", value: loading ? "…" : `${quota} session${quota !== 1 ? "s" : ""}` },
            { label: "Squad size", value: loading ? "…" : `${total}` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-card border border-border rounded-2xl shadow-card p-3 text-center">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
              <p className="text-sm font-extrabold text-foreground font-display leading-tight">{value}</p>
            </div>
          ))}
        </div>

        {/* Percent breakdown */}
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden mb-4">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Breakdown this week</p>
          </div>
          {loading ? (
            <div className="px-5 py-6 text-sm text-muted-foreground">Loading…</div>
          ) : (
            <ul className="divide-y divide-border">
              {breakdownBuckets.map((b) => (
                <li key={b.label} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${b.highlight ? "text-foreground" : "text-muted-foreground"}`}>
                      {b.label}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Bar */}
                    <div className="w-20 h-1.5 rounded-full bg-secondary overflow-hidden hidden sm:block">
                      <div
                        className={`h-full rounded-full ${b.highlight ? "bg-primary" : "bg-muted-foreground/40"}`}
                        style={{ width: `${b.pctVal}%` }}
                      />
                    </div>
                    <span className={`text-sm font-bold font-display w-20 text-right ${b.highlight ? "text-foreground" : "text-muted-foreground"}`}>
                      {b.pctVal}% ({b.count}/{total})
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Collapsible met / not met lists */}
        {!loading && (
          <div className="flex flex-col gap-3 mb-4">
            <CollapsibleList
              title={`Met quota (${quota}) — ${metNames.length} player${metNames.length !== 1 ? "s" : ""}`}
              names={metNames}
              defaultOpen={true}
            />
            <CollapsibleList
              title={`Did not meet quota — ${notMetNames.length} player${notMetNames.length !== 1 ? "s" : ""}`}
              names={notMetNames}
            />
          </div>
        )}

        {/* This week leaderboard */}
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden mb-4">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-sm font-semibold text-foreground">This week leaderboard</p>
          </div>
          {loading ? (
            <div className="px-5 py-6 text-sm text-muted-foreground">Loading…</div>
          ) : weekly.length === 0 ? (
            <div className="px-5 py-6 text-sm text-muted-foreground">No data.</div>
          ) : (
            <ul className="divide-y divide-border">
              {weekly.map((r, i) => (
                <li key={r.name} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">{i + 1}</span>
                  <span className="flex-1 text-sm font-medium text-foreground truncate">{r.name}</span>
                  <span className={`text-sm font-bold font-display ${r.count >= quota ? "text-foreground" : "text-muted-foreground"}`}>
                    {r.count}
                    {r.count >= quota && <span className="ml-1 text-xs">✓</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Overall leaderboard */}
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Overall leaderboard</p>
          </div>
          {loading ? (
            <div className="px-5 py-6 text-sm text-muted-foreground">Loading…</div>
          ) : overall.length === 0 ? (
            <div className="px-5 py-6 text-sm text-muted-foreground">No data.</div>
          ) : (
            <ul className="divide-y divide-border">
              {overall.map((r, i) => (
                <li key={r.name} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">{i + 1}</span>
                  <span className="flex-1 text-sm font-medium text-foreground truncate">{r.name}</span>
                  <span className="text-sm font-bold font-display text-foreground">{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </main>
  );
}
