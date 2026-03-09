"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import AppShell from "@/components/AppShell";
import AdminPlaceholder from "@/components/AdminPlaceholder";
import PageContainer from "@/components/PageContainer";

type QuotaStatus = "idle" | "loading" | "saving" | "saved" | "error";

function WeeklyQuotaControl() {
  const [quota, setQuota] = useState<number>(3);
  const [status, setStatus] = useState<QuotaStatus>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus("loading");
      setErrorMsg(null);
      try {
        const res = await fetch("/api/settings");
        const body = (await res.json().catch(() => null)) as { value?: number; error?: string } | null;
        if (!res.ok || body == null) {
          setErrorMsg(body?.error || "Failed to load quota.");
          setStatus("error");
          return;
        }
        if (!cancelled) {
          setQuota(typeof body.value === "number" ? body.value : 3);
          setStatus("idle");
        }
      } catch {
        if (!cancelled) { setErrorMsg("Failed to load quota."); setStatus("error"); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const onChange = useCallback(async (next: number) => {
    setQuota(next);
    setStatus("saving");
    setErrorMsg(null);
    if (savedTimer.current) clearTimeout(savedTimer.current);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value: next }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        const detail = body?.error || `HTTP ${res.status}`;
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.error("Weekly quota save failed", { status: res.status, body });
        }
        setErrorMsg(detail);
        setStatus("error");
        return;
      }
      setStatus("saved");
      savedTimer.current = setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setErrorMsg("Failed to save quota.");
      setStatus("error");
    }
  }, []);

  const isDisabled = status === "loading" || status === "saving";

  return (
    <div className="mt-5 bg-card border border-border rounded-2xl shadow-card p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-xs font-semibold text-muted-foreground">Weekly quota</p>
        {status === "loading" && (
          <span className="text-xs text-muted-foreground">Loading…</span>
        )}
        {status === "saving" && (
          <span className="text-xs text-muted-foreground">Saving…</span>
        )}
        {status === "saved" && (
          <span className="text-xs text-primary font-semibold">Saved ✓</span>
        )}
        {status === "error" && (
          <span className="text-xs text-destructive">{errorMsg}</span>
        )}
      </div>

      <label className="block text-xs font-semibold text-muted-foreground mb-2">
        Sessions required per week
      </label>
      <select
        value={quota}
        onChange={(e) => void onChange(Number(e.target.value))}
        disabled={isDisabled}
        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none disabled:opacity-50"
      >
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
    </div>
  );
}

export default function AdminScreen({ teamName, authed }: { teamName: string; authed: boolean }) {
  const router = useRouter();

  const onBack = useCallback(() => {
    router.push("/");
  }, [router]);

  return (
    <AppShell teamName={teamName}>
      <AdminPlaceholder onBack={onBack} />

      <PageContainer className="pb-8">
        {!authed ? (
          <div className="text-center">
            <Link href="/admin/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Admin login
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-card border border-border rounded-2xl shadow-card p-4">
              <p className="text-xs text-muted-foreground mb-3 text-center">Quick links</p>
              <div className="flex flex-col gap-2">
                <Link href="/admin/sessions" className="text-sm font-semibold text-foreground hover:underline">
                  Sessions
                </Link>
                <Link href="/admin/exercises" className="text-sm font-semibold text-foreground hover:underline">
                  Exercises
                </Link>
                <Link href="/admin/uploads" className="text-sm font-semibold text-foreground hover:underline">
                  View uploads
                </Link>
                <Link href="/admin/report" className="text-sm font-semibold text-foreground hover:underline">
                  Weekly report
                </Link>
              </div>
            </div>

            <WeeklyQuotaControl />
          </>
        )}
      </PageContainer>
    </AppShell>
  );
}
