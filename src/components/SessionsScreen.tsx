"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, AlertCircle } from "lucide-react";

import AppShell from "@/components/AppShell";
import BackButton from "@/components/BackButton";
import PageContainer from "@/components/PageContainer";
import ToastBanner from "@/components/ToastBanner";

type ToastState = { message: string; type: "success" | "error" };

type ApiExercise = {
  id: string;
  name: string;
  sort_order: number;
};

type ApiResponse = {
  weekStart: string;
  session: null | {
    id: string;
    week_start: string;
    template_id: string;
    template_title: string | null;
    exercises: ApiExercise[];
  };
  error?: string;
};

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border shadow-card animate-pulse">
      <div className="w-5 h-5 rounded-md bg-secondary" />
      <div className="flex-1">
        <div className="h-3 w-2/3 bg-secondary rounded" />
      </div>
    </div>
  );
}

export default function SessionsScreen({ teamName }: { teamName: string }) {
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
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sessionTitle = useMemo(() => {
    const t = data?.session?.template_title;
    if (typeof t === "string" && t.trim().length > 0) return t;
    return "This week’s session";
  }, [data?.session?.template_title]);

  const onBack = useCallback(() => {
    router.push("/");
  }, [router]);

  return (
    <AppShell teamName={teamName}>
      {toast && <ToastBanner message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      <PageContainer className="pt-5 sm:pt-6 pb-8 animate-fade-up">
        <div className="mb-4">
          <BackButton onClick={onBack} />
        </div>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center shadow-card">
            <ClipboardCheck className="w-4.5 h-4.5 text-foreground" strokeWidth={2} />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-xl text-foreground leading-tight">Sessions</h2>
            <p className="text-xs text-muted-foreground">What you’re training this week</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="bg-card border border-border rounded-2xl shadow-card p-5 animate-pulse">
              <div className="h-4 w-2/3 bg-secondary rounded" />
              <div className="mt-2 h-3 w-1/3 bg-secondary rounded" />
            </div>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : error ? (
          <div className="bg-card border border-border rounded-2xl shadow-card p-6">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-4">
              <AlertCircle className="w-5 h-5 text-foreground" />
            </div>
            <h3 className="font-display font-bold text-lg text-foreground mb-1">Couldn’t load session</h3>
            <p className="text-sm text-muted-foreground mb-5">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold shadow-button hover:opacity-95 active-scale"
            >
              Try again
            </button>
          </div>
        ) : !data?.session ? (
          <div className="bg-card border border-border rounded-2xl shadow-card p-6">
            <h3 className="font-display font-bold text-lg text-foreground mb-1">No session assigned yet</h3>
            <p className="text-sm text-muted-foreground">Check back later.</p>
          </div>
        ) : (
          <>
            <div className="bg-card border border-border rounded-2xl shadow-card p-5 mb-4">
              <p className="text-xs font-semibold text-muted-foreground">Week starting</p>
              <p className="text-sm font-semibold text-foreground mt-1">{data.weekStart}</p>
              <p className="font-display font-extrabold text-lg text-foreground mt-3">{sessionTitle}</p>
            </div>

            <div className="space-y-2">
              {data.session.exercises.map((ex, i) => (
                <div
                  key={ex.id || `${ex.name}-${i}`}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border shadow-card"
                >
                  <div className="w-5 h-5 rounded-md border-2 border-muted-foreground/30 bg-background flex items-center justify-center shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{ex.name}</p>
                  </div>
                </div>
              ))}

              {data.session.exercises.length === 0 && (
                <div className="bg-card border border-border rounded-2xl shadow-card p-6">
                  <p className="text-sm text-muted-foreground">No exercises found for this session.</p>
                </div>
              )}
            </div>
          </>
        )}
      </PageContainer>
    </AppShell>
  );
}
