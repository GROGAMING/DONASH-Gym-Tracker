"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, BarChart2, ChevronDown, ChevronUp, Dumbbell, Search, TrendingUp, Users } from "lucide-react";

import AppShell from "@/components/AppShell";
import BackButton from "@/components/BackButton";
import PageContainer from "@/components/PageContainer";

// ── shared types ──────────────────────────────────────────────────────────────

type Player = { id: string; name: string; sessionCount: number };

type SetEntry = {
  id?: string;
  set_number?: number;
  reps: number | null;
  weight: number | null;
  created_at: string;
};

type ExerciseSummary = {
  name: string;
  totalSets: number;
  totalVolume: number;
  bestSet: SetEntry | null;
  allSets: SetEntry[];
};

type SummaryData = {
  tab: "summary";
  totalPlayers: number;
  pctLoggedLast7Days: number;
  playersLoggedLast7Days: number;
  totalSets: number;
  totalVolume: number;
  mostLoggedExercise: string | null;
  mostLoggedCount: number;
  players: Player[];
};

type PlayerData = {
  tab: "player";
  players: Player[];
  playerName?: string;
  exercises?: ExerciseSummary[];
};

type ApiData = SummaryData | PlayerData | null;

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtWeight(w: number | null) {
  if (w == null) return "—";
  return `${w} kg`;
}
function fmtReps(r: number | null) {
  if (r == null) return "—";
  return `${r} reps`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function fmtVolume(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}t`;
  return `${v} kg`;
}

// ── sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-card p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-display font-extrabold text-foreground leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SearchInput({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

const SETS_PREVIEW = 10;

function ExerciseCard({ ex }: { ex: ExerciseSummary }) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const visibleSets = showAll ? ex.allSets : ex.allSets.slice(0, SETS_PREVIEW);
  const hasMore = ex.allSets.length > SETS_PREVIEW;

  return (
    <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{ex.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {ex.totalSets} sets · {fmtVolume(ex.totalVolume)} total volume
            {ex.bestSet && ex.bestSet.weight != null
              ? ` · Best: ${fmtWeight(ex.bestSet.weight)} × ${fmtReps(ex.bestSet.reps)}`
              : ""}
          </p>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4">
          <div className="flex items-center justify-between mt-3 mb-2">
            <p className="text-xs font-semibold text-muted-foreground">
              {showAll ? `All ${ex.allSets.length} sets` : `Recent sets`}
            </p>
            {hasMore && (
              <button
                type="button"
                onClick={() => setShowAll((p) => !p)}
                className="text-xs font-semibold text-primary hover:opacity-80 transition-opacity"
              >
                {showAll ? "Show less" : `View all ${ex.allSets.length} sets`}
              </button>
            )}
          </div>
          {ex.allSets.length === 0 ? (
            <p className="text-xs text-muted-foreground">No sets logged.</p>
          ) : (
            <div className="space-y-1.5">
              {visibleSets.map((s, i) => (
                <div key={s.id ?? i} className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-muted-foreground">
                    {fmtDate(s.created_at)} · Set {s.set_number ?? i + 1}
                  </span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {fmtWeight(s.weight)} × {fmtReps(s.reps)}
                  </span>
                </div>
              ))}
            </div>
          )}
          {hasMore && !showAll && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-3 w-full text-xs font-semibold text-muted-foreground hover:text-foreground border border-border rounded-xl py-2 transition-colors"
            >
              View all {ex.allSets.length} sets
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── main tabs ─────────────────────────────────────────────────────────────────

type Tab = "summary" | "player";

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "summary", label: "Summary" },
    { id: "player", label: "By player" },
  ];
  return (
    <div className="flex gap-1 bg-secondary rounded-2xl p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
            active === t.id
              ? "bg-card text-foreground shadow-card"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── screen ────────────────────────────────────────────────────────────────────

export default function AdminWeightsReportScreen({ teamName }: { teamName: string }) {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("summary");
  const [data, setData] = useState<ApiData>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [playerSearch, setPlayerSearch] = useState("");

  const fetch_ = useCallback(async (t: Tab, pid: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ tab: t });
      if (t === "player" && pid) params.set("playerId", pid);
      const res = await fetch(`/api/admin/weights-report?${params.toString()}`);
      const body = await res.json().catch(() => null);
      if (!res.ok) { setError(body?.error ?? "Failed to load."); setData(null); return; }
      setData(body);
    } catch {
      setError("Failed to load.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch_(tab, selectedPlayer);
  }, [tab, selectedPlayer, fetch_]);

  // ── player list for tab="player" ─────────────────────────────────────────
  const players: Player[] =
    data && "players" in data && Array.isArray((data as { players: Player[] }).players)
      ? (data as { players: Player[] }).players
      : [];

  const filteredPlayers = players.filter((p) =>
    p.name.toLowerCase().includes(playerSearch.toLowerCase())
  );

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <AppShell teamName={teamName}>
      <PageContainer className="pt-5 sm:pt-6 pb-10 animate-fade-up">
        <div className="mb-5">
          <BackButton onClick={() => router.push("/admin")} />
        </div>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center shadow-card">
            <Dumbbell className="w-4.5 h-4.5 text-foreground" strokeWidth={2} />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-xl text-foreground leading-tight">Weights report</h2>
            <p className="text-xs text-muted-foreground">Lifting logs &amp; progress</p>
          </div>
        </div>

        <TabBar active={tab} onChange={(t) => { setTab(t); }} />

        <div className="mt-4">
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card border border-border rounded-2xl shadow-card p-4 animate-pulse h-16" />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="bg-card border border-border rounded-2xl shadow-card p-5">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* ── SUMMARY ── */}
          {!loading && !error && tab === "summary" && data?.tab === "summary" && (() => {
            const d = data as SummaryData;
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    label="Logged last 7d"
                    value={`${d.pctLoggedLast7Days}%`}
                    sub={`${d.playersLoggedLast7Days} / ${d.totalPlayers} players`}
                    icon={<Users className="w-4 h-4 text-foreground" />}
                  />
                  <StatCard
                    label="Total sets"
                    value={d.totalSets.toLocaleString()}
                    sub="all time"
                    icon={<Activity className="w-4 h-4 text-foreground" />}
                  />
                  <StatCard
                    label="Total volume"
                    value={fmtVolume(d.totalVolume)}
                    sub="all time"
                    icon={<TrendingUp className="w-4 h-4 text-foreground" />}
                  />
                  <StatCard
                    label="Top exercise"
                    value={d.mostLoggedExercise ?? "—"}
                    sub={d.mostLoggedCount > 0 ? `${d.mostLoggedCount} sets` : undefined}
                    icon={<BarChart2 className="w-4 h-4 text-foreground" />}
                  />
                </div>

                {d.totalSets === 0 && (
                  <div className="bg-card border border-border rounded-2xl shadow-card p-5">
                    <p className="text-sm text-muted-foreground">No lifting data logged yet.</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── BY PLAYER ── */}
          {!loading && !error && tab === "player" && (
            <div className="space-y-4">
              <SearchInput
                placeholder="Search player…"
                value={playerSearch}
                onChange={setPlayerSearch}
              />

              {!selectedPlayer && (
                <div className="space-y-2">
                  {filteredPlayers.length === 0 && (
                    <p className="text-sm text-muted-foreground px-1">No players found.</p>
                  )}
                  {filteredPlayers.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setSelectedPlayer(p.id); setPlayerSearch(""); }}
                      className="w-full text-left bg-card border border-border rounded-2xl shadow-card px-4 py-3 hover:opacity-90 transition-opacity"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-foreground">{p.name}</span>
                        <span className="shrink-0 min-w-[1.75rem] text-center text-xs font-semibold bg-secondary text-muted-foreground rounded-full px-2 py-0.5">
                          {p.sessionCount}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedPlayer && data?.tab === "player" && (() => {
                const d = data as PlayerData;
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{d.playerName}</p>
                      <button
                        type="button"
                        onClick={() => setSelectedPlayer("")}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        ← Back
                      </button>
                    </div>

                    {(!d.exercises || d.exercises.length === 0) ? (
                      <div className="bg-card border border-border rounded-2xl shadow-card p-5">
                        <p className="text-sm text-muted-foreground">No sets logged for this player.</p>
                      </div>
                    ) : (
                      d.exercises.map((ex) => <ExerciseCard key={ex.name} ex={ex} />)
                    )}
                  </div>
                );
              })()}
            </div>
          )}

        </div>
      </PageContainer>
    </AppShell>
  );
}
