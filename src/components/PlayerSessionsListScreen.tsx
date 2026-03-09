"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, ChevronRight, History, AlertCircle } from "lucide-react";

import AppShell from "@/components/AppShell";
import BackButton from "@/components/BackButton";
import PageContainer from "@/components/PageContainer";
import ToastBanner from "@/components/ToastBanner";
import { PrimaryButton } from "@/components/GymButtons";

type ToastState = { message: string; type: "success" | "error" };

type ApiExercise = {
  id: string;
  name: string;
  sort_order: number;
  target_sets: number | null;
  target_reps: string | null;
};

type SessionItem = {
  id: string;
  week_start: string;
  created_at: string | null;
  template_id: string;
  template_title: string | null;
  exercises: ApiExercise[];
};

type ApiResponse = {
  sessions: SessionItem[];
  error?: string;
};

function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-card p-5 animate-pulse">
      <div className="h-4 w-2/3 bg-secondary rounded" />
      <div className="mt-2 h-3 w-1/3 bg-secondary rounded" />
    </div>
  );
}

export default function PlayerSessionsListScreen({ teamName }: { teamName: string }) {
  const router = useRouter();

  const [toast, setToast] = useState<ToastState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/sessions");
      const body = (await res.json().catch(() => null)) as ApiResponse | null;

      if (!res.ok) {
        setError(body?.error || "Failed to load sessions.");
        setData(null);
        return;
      }

      setData(body);
    } catch {
      setError("Failed to load sessions.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sessions = useMemo(() => data?.sessions ?? [], [data?.sessions]);

  return (
    <AppShell teamName={teamName}>
      {toast && <ToastBanner message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      <PageContainer className="pt-5 sm:pt-6 pb-8 animate-fade-up">
        <div className="mb-4 flex items-center justify-between gap-3">
          <BackButton onClick={() => router.push("/")} />
          <button
            type="button"
            onClick={() => router.push("/sessions/history")}
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <History className="w-4 h-4" />
            History
          </button>
        </div>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center shadow-card">
            <ClipboardCheck className="w-4.5 h-4.5 text-foreground" strokeWidth={2} />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-xl text-foreground leading-tight">Sessions</h2>
            <p className="text-xs text-muted-foreground">Log your training</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : error ? (
          <div className="bg-card border border-border rounded-2xl shadow-card p-6">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-4">
              <AlertCircle className="w-5 h-5 text-foreground" />
            </div>
            <h3 className="font-display font-bold text-lg text-foreground mb-1">Couldn’t load sessions</h3>
            <p className="text-sm text-muted-foreground mb-5">{error}</p>
            <PrimaryButton type="button" onClick={() => void load()}>Try again</PrimaryButton>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl shadow-card p-6">
            <h3 className="font-display font-bold text-lg text-foreground mb-1">No session posted yet</h3>
            <p className="text-sm text-muted-foreground">Check back later.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => router.push(`/sessions/${encodeURIComponent(s.id)}`)}
                className="w-full text-left bg-card border border-border rounded-2xl shadow-card p-5 hover:opacity-95 transition-opacity"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display font-extrabold text-lg text-foreground">
                      {(s.template_title ?? "").trim().length > 0 ? s.template_title : "Active session"}
                    </p>
                    {s.created_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Assigned {new Date(s.created_at).toLocaleDateString()}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {s.exercises.length} exercise{s.exercises.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground mt-1" />
                </div>
              </button>
            ))}
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
}
