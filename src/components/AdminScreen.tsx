"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BarChart2, ClipboardList, Dumbbell, ImageIcon, Settings, Users } from "lucide-react";

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
    <div className="bg-card border border-border rounded-2xl shadow-card p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Weekly quota</p>
        </div>
        <span className="text-xs text-muted-foreground">
          {status === "loading" && "Loading…"}
          {status === "saving" && "Saving…"}
          {status === "saved" && <span className="text-primary font-semibold">Saved ✓</span>}
          {status === "error" && <span className="text-destructive">{errorMsg}</span>}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-2">Sessions required per week</p>
      <select
        value={quota}
        onChange={(e) => void onChange(Number(e.target.value))}
        disabled={isDisabled}
        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm outline-none disabled:opacity-50"
      >
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <option key={n} value={n}>{n} session{n !== 1 ? "s" : ""}</option>
        ))}
      </select>
    </div>
  );
}

type SectionCardProps = {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
};

function SectionCard({ href, icon, title, description }: SectionCardProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 bg-card border border-border rounded-2xl shadow-card p-4 hover:shadow-card-hover hover:border-foreground/20 transition-all active-scale"
    >
      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </Link>
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

      <PageContainer className="pb-10">
        {!authed ? (
          <div className="mt-6 flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground">You must be logged in to access admin.</p>
            <Link
              href="/admin/login"
              className="text-sm font-semibold text-foreground underline-offset-2 hover:underline"
            >
              Admin login →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-2">
            <SectionCard
              href="/admin/sessions"
              icon={<ClipboardList className="w-5 h-5 text-foreground" />}
              title="Sessions"
              description="Create templates and assign weekly sessions"
            />
            <SectionCard
              href="/admin/exercises"
              icon={<Dumbbell className="w-5 h-5 text-foreground" />}
              title="Exercises"
              description="Manage the exercise library for session templates"
            />
            <SectionCard
              href="/admin/report"
              icon={<BarChart2 className="w-5 h-5 text-foreground" />}
              title="Weekly Report"
              description="Quota breakdown and leaderboard summary"
            />
            <SectionCard
              href="/admin/uploads"
              icon={<ImageIcon className="w-5 h-5 text-foreground" />}
              title="View uploads"
              description="Browse all player photo uploads"
            />
            <SectionCard
              href="/admin/team"
              icon={<Users className="w-5 h-5 text-foreground" />}
              title="Manage team"
              description="Add or remove players from the squad"
            />

            <div className="mt-2">
              <WeeklyQuotaControl />
            </div>
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
}
