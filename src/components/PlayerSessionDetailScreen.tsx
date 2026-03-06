"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, ChevronDown } from "lucide-react";

import AppShell from "@/components/AppShell";
import BackButton from "@/components/BackButton";
import PageContainer from "@/components/PageContainer";
import ToastBanner from "@/components/ToastBanner";
import { PrimaryButton, SecondaryButton } from "@/components/GymButtons";
import { useSelectedPlayer } from "@/lib/useSelectedPlayer";

type ToastState = { message: string; type: "success" | "error" };

type ApiExercise = {
  id: string;
  name: string;
  sort_order: number;
  target_sets: number | null;
  target_reps: string | null;
};

type ApiResponse = {
  session: {
    id: string;
    week_start: string;
    template_id: string;
    template_title: string | null;
    exercises: ApiExercise[];
  };
  error?: string;
};

type SetRow = {
  id: string;
  weight: string;
  reps: string;
};

type LastTimeResponse = {
  last: Record<string, { reps: number | null; weight: number | null; set_number: number; created_at: string }[]>;
  error?: string;
};

type SaveState = "idle" | "saving" | "saved";

type LocalDraft = {
  sets: Record<string, { weight: string; reps: string }[]>;
  collapsed: Record<string, boolean>;
};

function newSetRow(): SetRow {
  return { id: `${Date.now()}-${Math.random()}`, weight: "", reps: "" };
}

function makeDefaultRows(ex: ApiExercise): SetRow[] {
  const count = typeof ex.target_sets === "number" && ex.target_sets > 0 ? ex.target_sets : 1;
  return Array.from({ length: count }, () => newSetRow());
}

function localKey(playerId: string, weeklySessionId: string) {
  return `draft2:${playerId}:${weeklySessionId}`;
}

function buildSummary(rows: SetRow[]): string {
  const filled = rows.filter((r) => r.weight.trim() !== "" || r.reps.trim() !== "");
  if (filled.length === 0) return `${rows.length} set${rows.length !== 1 ? "s" : ""} logged`;

  const weights = filled.map((r) => r.weight.trim()).filter(Boolean);
  const repsArr = filled.map((r) => r.reps.trim()).filter(Boolean);

  const uniqueWeights = [...new Set(weights)];
  const uniqueReps = [...new Set(repsArr)];

  const repsStr = uniqueReps.length === 1 ? uniqueReps[0] : repsArr.join(",");
  const weightStr = uniqueWeights.length === 0
    ? ""
    : uniqueWeights.length === 1
    ? `@ ${uniqueWeights[0]}kg`
    : `@ ${uniqueWeights.join("/")}kg`;

  return `${filled.length}×${repsStr}${weightStr ? " " + weightStr : ""}`.trim();
}

export default function PlayerSessionDetailScreen({ teamName, weeklySessionId }: { teamName: string; weeklySessionId: string }) {
  const router = useRouter();
  const { player } = useSelectedPlayer();
  const playerId = player?.playerId ?? null;

  const [toast, setToast] = useState<ToastState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [logging, setLogging] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const [setsByExercise, setSetsByExercise] = useState<Record<string, SetRow[]>>({});
  const [collapsedExercise, setCollapsedExercise] = useState<Record<string, boolean>>({});
  const [lastTime, setLastTime] = useState<LastTimeResponse | null>(null);

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoad = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(weeklySessionId)}`);
      const body = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok) { setError(body?.error || "Failed to load session."); setData(null); return; }
      setData(body);
    } catch {
      setError("Failed to load session."); setData(null);
    } finally {
      setLoading(false);
    }
  }, [weeklySessionId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const templateId = data?.session?.template_id;
    if (!playerId || !templateId) return;
    (async () => {
      const res = await fetch(`/api/player-sessions/last-time?playerId=${encodeURIComponent(playerId)}&templateId=${encodeURIComponent(templateId)}`);
      const body = (await res.json().catch(() => null)) as LastTimeResponse | null;
      setLastTime(res.ok ? body : { last: {}, error: body?.error || "Failed to load last time." });
    })();
  }, [data?.session?.template_id, playerId]);

  // Restore draft on load: Supabase first, fallback to localStorage, fallback to prefilled defaults
  useEffect(() => {
    if (!data?.session || !playerId || !isFirstLoad.current) return;
    isFirstLoad.current = false;

    const exercises = data.session.exercises;

    (async () => {
      // Try Supabase draft
      try {
        const res = await fetch(`/api/player-sessions/draft?weeklySessionId=${encodeURIComponent(weeklySessionId)}&playerId=${encodeURIComponent(playerId)}`);
        if (res.ok) {
          const body = (await res.json()) as { draft: { id: string; sets: { exercise_id: string | null; exercise_name: string; set_number: number; reps: number | null; weight: number | null }[] } | null };
          if (body.draft && body.draft.sets.length > 0) {
            const restored: Record<string, SetRow[]> = {};
            for (const ex of exercises) {
              restored[ex.id] = makeDefaultRows(ex);
            }
            for (const s of body.draft.sets) {
              const ex = exercises.find((e) => e.name === s.exercise_name || e.id === s.exercise_id);
              if (!ex) continue;
              const idx = s.set_number - 1;
              if (idx < 0) continue;
              while (restored[ex.id].length <= idx) restored[ex.id].push(newSetRow());
              restored[ex.id][idx] = { id: `${Date.now()}-${Math.random()}`, weight: s.weight != null ? String(s.weight) : "", reps: s.reps != null ? String(s.reps) : "" };
            }
            setSetsByExercise(restored);
            return;
          }
        }
      } catch { /* fall through */ }

      // Try localStorage
      try {
        const raw = localStorage.getItem(localKey(playerId, weeklySessionId));
        if (raw) {
          const parsed = JSON.parse(raw) as LocalDraft;
          if (parsed.sets) {
            const restored: Record<string, SetRow[]> = {};
            for (const ex of exercises) {
              const saved = parsed.sets[ex.id];
              if (saved && saved.length > 0) {
                restored[ex.id] = saved.map((r) => ({ id: `${Date.now()}-${Math.random()}`, weight: r.weight, reps: r.reps }));
              } else {
                restored[ex.id] = makeDefaultRows(ex);
              }
            }
            setSetsByExercise(restored);
            if (parsed.collapsed) setCollapsedExercise(parsed.collapsed);
            return;
          }
        }
      } catch { /* ignore */ }

      // Fallback: prefill from target_sets
      const defaults: Record<string, SetRow[]> = {};
      for (const ex of exercises) {
        defaults[ex.id] = makeDefaultRows(ex);
      }
      setSetsByExercise(defaults);
    })();
  }, [data, playerId, weeklySessionId]);

  const buildSetPayload = useCallback((session: ApiResponse["session"]) => {
    const payload: { exerciseId: string; exerciseName: string; setNumber: number; reps: number | null; weight: number | null }[] = [];
    for (const ex of session.exercises) {
      const rows = setsByExercise[ex.id] ?? [];
      rows.forEach((r, idx) => {
        const w = r.weight.trim(); const repsStr = r.reps.trim();
        const weight = w === "" ? null : (Number.isFinite(Number(w)) ? Number(w) : null);
        const reps = repsStr === "" ? null : (Number.isFinite(Number(repsStr)) ? Number(repsStr) : null);
        payload.push({ exerciseId: ex.id, exerciseName: ex.name, setNumber: idx + 1, reps, weight });
      });
    }
    return payload;
  }, [setsByExercise]);

  const triggerAutosave = useCallback((
    sets: Record<string, SetRow[]>,
    collapsed: Record<string, boolean>,
  ) => {
    if (!playerId || !data?.session) return;

    // localStorage immediately
    try {
      const draft: LocalDraft = {
        sets: Object.fromEntries(Object.entries(sets).map(([k, v]) => [k, v.map((r) => ({ weight: r.weight, reps: r.reps }))])),
        collapsed,
      };
      localStorage.setItem(localKey(playerId, weeklySessionId), JSON.stringify(draft));
    } catch { /* ignore */ }

    // Supabase debounced
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    setSaveState("saving");
    autosaveTimer.current = setTimeout(async () => {
      try {
        const session = data.session;
        const payload: { exerciseId: string; exerciseName: string; setNumber: number; reps: number | null; weight: number | null }[] = [];
        for (const ex of session.exercises) {
          const rows = sets[ex.id] ?? [];
          rows.forEach((r, idx) => {
            const w = r.weight.trim(); const repsStr = r.reps.trim();
            const weight = w === "" ? null : (Number.isFinite(Number(w)) ? Number(w) : null);
            const reps = repsStr === "" ? null : (Number.isFinite(Number(repsStr)) ? Number(repsStr) : null);
            payload.push({ exerciseId: ex.id, exerciseName: ex.name, setNumber: idx + 1, reps, weight });
          });
        }
        await fetch("/api/player-sessions/draft", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ weeklySessionId, playerId, sets: payload }),
        });
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
      } catch { setSaveState("idle"); }
    }, 800);
  }, [data, playerId, weeklySessionId]);

  const title = useMemo(() => {
    const t = data?.session?.template_title;
    return typeof t === "string" && t.trim().length > 0 ? t : "Session";
  }, [data?.session?.template_title]);

  const addSet = useCallback((exerciseId: string) => {
    setSetsByExercise((prev) => {
      const next = { ...prev, [exerciseId]: [...(prev[exerciseId] ?? makeDefaultRows({ id: exerciseId, name: "", sort_order: 0, target_sets: null, target_reps: null })), newSetRow()] };
      triggerAutosave(next, collapsedExercise);
      return next;
    });
  }, [collapsedExercise, triggerAutosave]);

  const toggleCollapsed = useCallback((exerciseId: string) => {
    setCollapsedExercise((prev) => {
      const next = { ...prev, [exerciseId]: !prev[exerciseId] };
      triggerAutosave(setsByExercise, next);
      return next;
    });
  }, [setsByExercise, triggerAutosave]);

  const updateSet = useCallback((exerciseId: string, setId: string, patch: Partial<SetRow>) => {
    setSetsByExercise((prev) => {
      const next = {
        ...prev,
        [exerciseId]: (prev[exerciseId] ?? []).map((s) => (s.id === setId ? { ...s, ...patch } : s)),
      };
      triggerAutosave(next, collapsedExercise);
      return next;
    });
  }, [collapsedExercise, triggerAutosave]);

  const onLog = useCallback(async () => {
    if (logging) return;
    if (!playerId) { setToast({ message: "Pick your name first.", type: "error" }); return; }
    const session = data?.session;
    if (!session) return;

    const sets = buildSetPayload(session);
    setLogging(true);
    setToast(null);

    try {
      const res = await fetch("/api/player-sessions/log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ weeklySessionId: session.id, playerId, completed: true, sets }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) { setToast({ message: body?.error || "Failed to log session.", type: "error" }); return; }

      try { localStorage.removeItem(localKey(playerId, weeklySessionId)); } catch { /* ignore */ }
      setToast({ message: "Session logged!", type: "success" });
      setTimeout(() => router.push("/sessions/history"), 800);
    } catch {
      setToast({ message: "Failed to log session.", type: "error" });
    } finally {
      setLogging(false);
    }
  }, [buildSetPayload, data?.session, logging, playerId, router, weeklySessionId]);

  return (
    <AppShell teamName={teamName}>
      {toast && <ToastBanner message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      <PageContainer className="pt-5 sm:pt-6 pb-10 animate-fade-up">
        <div className="mb-4">
          <BackButton onClick={() => router.push("/sessions")} />
        </div>

        {loading ? (
          <div className="bg-card border border-border rounded-2xl shadow-card p-6 animate-pulse">
            <div className="h-4 w-2/3 bg-secondary rounded" />
            <div className="mt-2 h-3 w-1/3 bg-secondary rounded" />
          </div>
        ) : error ? (
          <div className="bg-card border border-border rounded-2xl shadow-card p-6">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-4">
              <AlertCircle className="w-5 h-5 text-foreground" />
            </div>
            <h3 className="font-display font-bold text-lg text-foreground mb-1">Couldn't load session</h3>
            <p className="text-sm text-muted-foreground mb-5">{error}</p>
            <PrimaryButton type="button" onClick={() => void load()}>Try again</PrimaryButton>
          </div>
        ) : !data?.session ? null : (
          <>
            <div className="bg-card border border-border rounded-2xl shadow-card p-5 mb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Week starting</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{data.session.week_start}</p>
                  <p className="font-display font-extrabold text-lg text-foreground mt-3">{title}</p>
                </div>
                {saveState !== "idle" && (
                  <p className="text-xs text-muted-foreground shrink-0">
                    {saveState === "saving" ? "Saving…" : "Saved ✓"}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {data.session.exercises.map((ex) => {
                const rows = setsByExercise[ex.id] ?? makeDefaultRows(ex);
                const isCollapsed = collapsedExercise[ex.id] === true;
                const last = lastTime?.last?.[ex.id] ?? [];
                const summary = buildSummary(rows);

                return (
                  <div key={ex.id} className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
                    {/* Header — always visible */}
                    <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{ex.name}</p>
                        {isCollapsed ? (
                          <p className="text-xs text-muted-foreground mt-0.5">{summary}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Target: {typeof ex.target_sets === "number" ? ex.target_sets : "—"} × {ex.target_reps || "—"}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleCollapsed(ex.id)}
                        className="shrink-0 flex items-center gap-1.5 text-xs font-semibold transition-colors text-foreground"
                      >
                        {isCollapsed ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                            <span>Done</span>
                            <ChevronDown className="w-3 h-3 text-muted-foreground" />
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Mark done</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Collapsible body */}
                    {!isCollapsed && (
                      <div className="px-5 pb-5">
                        {last.length > 0 && (
                          <p className="text-xs text-muted-foreground mb-3">
                            Last time: {last.slice().sort((a, b) => a.set_number - b.set_number).map((s) => `${s.weight ?? "—"} × ${s.reps ?? "—"}`).join(", ")}
                          </p>
                        )}

                        <div className="space-y-2">
                          {/* Column headers */}
                          <div className="grid grid-cols-12 gap-2 mb-1">
                            <div className="col-span-2" />
                            <p className="col-span-5 text-xs font-semibold text-muted-foreground px-1">kg</p>
                            <p className="col-span-5 text-xs font-semibold text-muted-foreground px-1">reps</p>
                          </div>

                          {rows.map((s, idx) => (
                            <div key={s.id} className="grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-2 flex items-center">
                                <p className="text-xs font-semibold text-muted-foreground">{idx + 1}</p>
                              </div>
                              <input
                                value={s.weight}
                                onChange={(e) => updateSet(ex.id, s.id, { weight: e.target.value })}
                                placeholder="—"
                                inputMode="decimal"
                                className="col-span-5 px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-ring"
                              />
                              <input
                                value={s.reps}
                                onChange={(e) => updateSet(ex.id, s.id, { reps: e.target.value })}
                                placeholder="—"
                                inputMode="numeric"
                                className="col-span-5 px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-ring"
                              />
                            </div>
                          ))}

                          <div className="pt-1">
                            <SecondaryButton type="button" onClick={() => addSet(ex.id)}>+ Add set</SecondaryButton>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6">
              <PrimaryButton type="button" onClick={() => void onLog()} disabled={logging} loading={logging}>
                Log session
              </PrimaryButton>
            </div>
          </>
        )}
      </PageContainer>
    </AppShell>
  );
}
