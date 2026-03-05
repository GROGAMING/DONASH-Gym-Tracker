"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";

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

function newSetRow(): SetRow {
  return {
    id: `${Date.now()}-${Math.random()}`,
    weight: "",
    reps: "",
  };
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

  const [setsByExercise, setSetsByExercise] = useState<Record<string, SetRow[]>>({});
  const [completedExercise, setCompletedExercise] = useState<Record<string, boolean>>({});

  const [lastTime, setLastTime] = useState<LastTimeResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(weeklySessionId)}`);
      const body = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok) {
        setError(body?.error || "Failed to load session.");
        setData(null);
        return;
      }
      setData(body);
    } catch {
      setError("Failed to load session.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [weeklySessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const templateId = data?.session?.template_id;
    if (!playerId || !templateId) return;

    (async () => {
      const res = await fetch(`/api/player-sessions/last-time?playerId=${encodeURIComponent(playerId)}&templateId=${encodeURIComponent(templateId)}`);
      const body = (await res.json().catch(() => null)) as LastTimeResponse | null;
      if (!res.ok) {
        setLastTime({ last: {}, error: body?.error || "Failed to load last time." });
        return;
      }
      setLastTime(body);
    })();
  }, [data?.session?.template_id, playerId]);

  const title = useMemo(() => {
    const t = data?.session?.template_title;
    if (typeof t === "string" && t.trim().length > 0) return t;
    return "Session";
  }, [data?.session?.template_title]);

  const addSet = useCallback((exerciseId: string) => {
    setSetsByExercise((prev) => ({
      ...prev,
      [exerciseId]: [...(prev[exerciseId] ?? [newSetRow()]), newSetRow()],
    }));
  }, []);

  const toggleCompleted = useCallback((exerciseId: string) => {
    setCompletedExercise((prev) => ({ ...prev, [exerciseId]: !prev[exerciseId] }));
  }, []);

  const updateSet = useCallback((exerciseId: string, setId: string, patch: Partial<SetRow>) => {
    setSetsByExercise((prev) => ({
      ...prev,
      [exerciseId]: (prev[exerciseId] ?? []).map((s) => (s.id === setId ? { ...s, ...patch } : s)),
    }));
  }, []);

  const onLog = useCallback(async () => {
    if (logging) return;
    if (!playerId) {
      setToast({ message: "Pick your name first.", type: "error" });
      return;
    }

    const session = data?.session;
    if (!session) return;

    const setPayload: any[] = [];
    for (const ex of session.exercises) {
      const rows = setsByExercise[ex.id] ?? [];
      rows.forEach((r, idx) => {
        const w = r.weight.trim();
        const reps = r.reps.trim();
        const weightNum = w === "" ? null : Number(w);
        const repsNum = reps === "" ? null : Number(reps);

        setPayload.push({
          exerciseId: ex.id,
          exerciseName: ex.name,
          setNumber: idx + 1,
          reps: typeof repsNum === "number" && Number.isFinite(repsNum) ? repsNum : null,
          weight: typeof weightNum === "number" && Number.isFinite(weightNum) ? weightNum : null,
        });
      });
    }

    setLogging(true);
    setToast(null);

    try {
      const res = await fetch("/api/player-sessions/log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          weeklySessionId: session.id,
          playerId,
          completed: true,
          sets: setPayload,
        }),
      });

      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setToast({ message: body?.error || "Failed to log session.", type: "error" });
        return;
      }

      setToast({ message: "Session logged.", type: "success" });
      router.push("/sessions/history");
    } catch {
      setToast({ message: "Failed to log session.", type: "error" });
    } finally {
      setLogging(false);
    }
  }, [data?.session, logging, playerId, router, setsByExercise]);

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
            <h3 className="font-display font-bold text-lg text-foreground mb-1">Couldn’t load session</h3>
            <p className="text-sm text-muted-foreground mb-5">{error}</p>
            <PrimaryButton type="button" onClick={() => void load()}>Try again</PrimaryButton>
          </div>
        ) : !data?.session ? null : (
          <>
            <div className="bg-card border border-border rounded-2xl shadow-card p-5 mb-4">
              <p className="text-xs font-semibold text-muted-foreground">Week starting</p>
              <p className="text-sm font-semibold text-foreground mt-1">{data.session.week_start}</p>
              <p className="font-display font-extrabold text-lg text-foreground mt-3">{title}</p>
            </div>

            <div className="space-y-3">
              {data.session.exercises.map((ex) => {
                const rows = setsByExercise[ex.id] ?? [newSetRow()];
                const isDone = completedExercise[ex.id] === true;
                const last = lastTime?.last?.[ex.id] ?? [];

                return (
                  <div key={ex.id} className="bg-card border border-border rounded-2xl shadow-card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{ex.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Target: {typeof ex.target_sets === "number" ? ex.target_sets : "—"} sets x {ex.target_reps || "—"}
                        </p>
                        {last.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Last time: {last
                              .slice()
                              .sort((a, b) => a.set_number - b.set_number)
                              .map((s) => `${s.weight ?? "—"} x ${s.reps ?? "—"}`)
                              .join(", ")}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleCompleted(ex.id)}
                        className={`inline-flex items-center gap-2 text-xs font-semibold transition-colors ${
                          isDone ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <CheckCircle2 className={`w-4 h-4 ${isDone ? "text-primary" : "text-muted-foreground"}`} />
                        {isDone ? "Done" : "Mark done"}
                      </button>
                    </div>

                    <div className="mt-4 space-y-2">
                      {rows.map((s, idx) => (
                        <div key={s.id} className="grid grid-cols-12 gap-2">
                          <div className="col-span-2 flex items-center">
                            <p className="text-xs font-semibold text-muted-foreground">{idx + 1}</p>
                          </div>
                          <input
                            value={s.weight}
                            onChange={(e) => updateSet(ex.id, s.id, { weight: e.target.value })}
                            placeholder="kg"
                            inputMode="decimal"
                            className="col-span-5 px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none"
                          />
                          <input
                            value={s.reps}
                            onChange={(e) => updateSet(ex.id, s.id, { reps: e.target.value })}
                            placeholder="reps"
                            inputMode="numeric"
                            className="col-span-5 px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none"
                          />
                        </div>
                      ))}

                      <div className="flex justify-between gap-3">
                        <SecondaryButton type="button" onClick={() => addSet(ex.id)}>Add set</SecondaryButton>
                      </div>
                    </div>
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
