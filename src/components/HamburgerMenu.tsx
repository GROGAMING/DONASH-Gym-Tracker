"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { useSelectedPlayer } from "@/lib/useSelectedPlayer";

export default function HamburgerMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastYRef = useRef(0);
  const tickingRef = useRef(false);

  const { player } = useSelectedPlayer();

  const links = useMemo(
    () => [
      { href: "/sessions", label: "Sessions" },
      { href: "/upload", label: "Upload" },
      { href: "/leaderboard", label: "Leaderboard" },
      { href: "/doom-scroll", label: "Doom Scroll" },
      { href: "/admin", label: "Admin" },
    ],
    [],
  );

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) setHidden(false);
  }, [open]);

  useEffect(() => {
    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        const last = lastYRef.current;
        const delta = y - last;

        if (open) {
          setHidden(false);
          lastYRef.current = y;
          tickingRef.current = false;
          return;
        }

        if (y <= 12) {
          setHidden(false);
        } else if (y > 80 && delta > 10) {
          setHidden(true);
        } else if (delta < -10) {
          setHidden(false);
        }

        lastYRef.current = y;
        tickingRef.current = false;
      });
    };

    lastYRef.current = window.scrollY || 0;
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div
        className={
          "fixed left-3 z-[60] transition-all duration-200 " +
          "top-[calc(env(safe-area-inset-top)+12px)] " +
          (hidden ? "opacity-0 -translate-y-2 pointer-events-none" : "opacity-100 translate-y-0")
        }
      >
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-11 w-11 rounded-2xl shadow-card border border-border bg-background/95 backdrop-blur-sm"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0">
          <div className="px-6 pt-6 pb-5 border-b border-border">
            <SheetHeader className="space-y-0.5">
              <SheetTitle className="font-display font-extrabold text-foreground">Gym Tracker</SheetTitle>
              <p className="text-xs text-muted-foreground">Rep Receipt</p>
            </SheetHeader>

            {player?.playerName && (
              <div className="mt-4 px-3 py-2.5 bg-secondary rounded-xl">
                <p className="text-[11px] font-medium text-muted-foreground">Signed in as</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{player.playerName}</p>
              </div>
            )}
          </div>

          <nav className="p-3 pt-4">
            <ul className="space-y-0.5">
              <li>
                <Link
                  href={`/select-player?next=${encodeURIComponent(pathname || "/")}`}
                  onClick={() => setOpen(false)}
                  className={
                    "block rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground transition-colors " +
                    (pathname.startsWith("/select-player") ? "bg-secondary" : "hover:bg-secondary")
                  }
                >
                  Change player
                </Link>
              </li>

              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={
                      "block rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground transition-colors " +
                      (pathname === l.href || pathname.startsWith(l.href + "/") ? "bg-secondary" : "hover:bg-secondary")
                    }
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
