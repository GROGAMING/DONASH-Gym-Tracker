"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import AppShell from "@/components/AppShell";
import AdminPlaceholder from "@/components/AdminPlaceholder";

export default function AdminScreen({ teamName, authed }: { teamName: string; authed: boolean }) {
  const router = useRouter();

  const onBack = useCallback(() => {
    router.push("/");
  }, [router]);

  return (
    <AppShell teamName={teamName}>
      <AdminPlaceholder onBack={onBack} />

      <div className="max-w-sm mx-auto px-4 pb-8">
        {!authed ? (
          <div className="text-center">
            <Link href="/admin/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Admin login
            </Link>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl shadow-card p-4">
            <p className="text-xs text-muted-foreground mb-3 text-center">Quick links</p>
            <div className="flex flex-col gap-2">
              <Link href="/admin/uploads" className="text-sm font-semibold text-foreground hover:underline">
                View uploads
              </Link>
              <Link href="/admin/report" className="text-sm font-semibold text-foreground hover:underline">
                Weekly report
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
