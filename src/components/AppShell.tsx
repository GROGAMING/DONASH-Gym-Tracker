"use client";

import { useCallback, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import BottomNav, { type Tab } from "@/components/BottomNav";
import TeamHeader from "@/components/TeamHeader";

function pathToTab(pathname: string): Tab {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/upload")) return "upload";
  if (pathname.startsWith("/sessions")) return "sessions";
  if (pathname.startsWith("/leaderboard")) return "leaderboard";
  if (pathname.startsWith("/doom-scroll")) return "doomscroll";
  return "home";
}

function tabToPath(tab: Tab): string {
  switch (tab) {
    case "home":
      return "/";
    case "upload":
      return "/upload";
    case "sessions":
      return "/sessions";
    case "leaderboard":
      return "/leaderboard";
    case "doomscroll":
      return "/doom-scroll";
    case "admin":
      return "/admin";
    default:
      return "/";
  }
}

export default function AppShell(
  { children, teamName, showBottomNav = true }: { children: ReactNode; teamName: string; showBottomNav?: boolean },
) {
  const router = useRouter();
  const pathname = usePathname();
  const active = pathToTab(pathname);

  const onChange = useCallback(
    (tab: Tab) => {
      router.push(tabToPath(tab));
    },
    [router],
  );

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <TeamHeader teamName={teamName} />
      <main className={"flex-1 overflow-y-auto " + (showBottomNav ? "pb-28" : "")} style={showBottomNav ? { paddingBottom: "calc(7rem + env(safe-area-inset-bottom, 0px))" } : undefined}>{children}</main>
      {showBottomNav && <BottomNav active={active} onChange={onChange} />}
    </div>
  );
}
