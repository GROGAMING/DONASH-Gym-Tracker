"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, History } from "lucide-react";

import AppShell from "@/components/AppShell";
import BackButton from "@/components/BackButton";
import PageContainer from "@/components/PageContainer";
import ToastBanner from "@/components/ToastBanner";
import { PrimaryButton } from "@/components/GymButtons";
import { useSelectedPlayer } from "@/lib/useSelectedPlayer";

type ToastState = { message: string; type: "success" | "error" };

type ApiResponse = {
  logs: {
    id: string;
    created_at: string;
    completed_at: string | null;
    weekly_session: null | {
      id: string;
      week_start: string;
      template_id: string;
      template_title: string | null;
    };
    sets: {
      id: string;
      exercise_id: string | null;
      exercise_name: string;
      set_number: number;
      reps: number | null;
      weight: number | null;
      created_at: string;
    }[];
  }[];
  error?: string;
};

export default function PlayerSessionHistoryScreen({ teamName }: { teamName: string }) {
  const router = useRouter();
  const { player } = useSelectedPlayer();
  const playerId = player?.playerId ?? null;

  const [toast, setToast] = useState<ToastState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);

  const load = useCallback(async () => {
    if (!playerId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/player-sessions/history?playerId=${encodeURIComponent(playerId)}`);
      const body = (await res.json().catch(() => null)) as ApiResponse | null;

      if (!res.ok) {
        setError(body?.error || "Failed to load history.");
        setData(null);
        return;
      }

      setData(body);
    } catch {
      setError("Failed to load history.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const logs = useMemo(() => data?.logs ?? [], [data?.logs]);

  return (
    <AppShell teamName={teamName}>
      {toast && <ToastBanner message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      <PageContainer className="pt-5 sm:pt-6 pb-8 animate-fade-up">
        <div className="mb-4">
          <BackButton onClick={() => router.push("/sessions")} />
        </div>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center shadow-card">
            <History className="w-4.5 h-4.5 text-foreground" strokeWidth={2} />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-xl text-foreground leading-tight">History</h2>
            <p className="text-xs text-muted-foreground">What you logged previously</p>
          </div>
        </div>

        {!playerId ? (
          <div className="bg-card border border-border rounded-2xl shadow-card p-6">
            <p className="text-sm text-muted-foreground">Pick your name first.</p>
          </div>
        ) : loading ? (
          <div className="bg-card border border-border rounded-2xl shadow-card p-6 animate-pulse">
            <div className="h-4 w-2/3 bg-secondary rounded" />
            <div className="mt-2 h-3 w-1/3 bg-secondary rounded" />
          </div>
        ) : error ? (
          <div className="bg-card border border-border rounded-2xl shadow-card p-6">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-4">
              <AlertCircle className="w-5 h-5 text-foreground" />
            </div>
            <h3 className="font-display font-bold text-lg text-foreground mb-1">Couldn’t load history</h3>
            <p className="text-sm text-muted-foreground mb-5">{error}</p>
            <PrimaryButton type="button" onClick={() => void load()}>Try again</PrimaryButton>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl shadow-card p-6">
            <h3 className="font-display font-bold text-lg text-foreground mb-1">No sessions yet</h3>
            <p className="text-sm text-muted-foreground">Log one from Sessions.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((l) => (
              <div key={l.id} className="bg-card border border-border rounded-2xl shadow-card p-5">
                <p className="text-xs font-semibold text-muted-foreground">Week starting</p>
                <p className="text-sm font-semibold text-foreground mt-1">{l.weekly_session?.week_start ?? "—"}</p>
                <p className="font-display font-extrabold text-lg text-foreground mt-3">
                  {l.weekly_session?.template_title ?? "Session"}
                </p>

                {l.sets.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {l.sets
                      .slice()
                      .sort((a, b) => a.created_at.localeCompare(b.created_at))
                      .slice(0, 10)
                      .map((s) => (
                        <p key={s.id} className="text-xs text-muted-foreground">
                          {s.exercise_name}: {s.weight ?? "—"} x {s.reps ?? "—"} (set {s.set_number})
                        </p>
                      ))}
                  </div>
                )}

                {l.weekly_session?.id && (
                  <div className="mt-4">
                    <PrimaryButton type="button" onClick={() => router.push(`/sessions/${encodeURIComponent(l.weekly_session!.id)}`)}>
                      Open session
                    </PrimaryButton>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
}
