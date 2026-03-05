"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";

import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PlayerSelect from "@/components/PlayerSelect";
import { PrimaryButton } from "@/components/GymButtons";
import ToastBanner from "@/components/ToastBanner";
import { setSelectedPlayer } from "@/lib/playerSession";

type Player = { id: string; name: string };

type ToastState = { message: string; type: "success" | "error" };

export default function SelectPlayerPage() {
  const router = useRouter();
  const [next, setNext] = useState("/");

  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const selectedPlayer = useMemo(
    () => players.find((p) => p.name === selectedName) ?? null,
    [players, selectedName],
  );

  const playerNames = useMemo(() => players.map((p) => p.name), [players]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      setNext(sp.get("next") || "/");
    }

    (async () => {
      setLoading(true);
      setToast(null);
      try {
        const res = await fetch("/api/players");
        if (!res.ok) {
          setToast({ message: "Failed to load players.", type: "error" });
          return;
        }
        const data = (await res.json()) as Player[];
        setPlayers(data);
      } catch {
        setToast({ message: "Failed to load players.", type: "error" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AppShell teamName="Gym Tracker" showBottomNav={false}>
      {toast && <ToastBanner message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      <PageContainer className="pt-6 sm:pt-8 pb-6 sm:pb-8 animate-fade-up">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shadow-button">
            <UserRound className="w-4.5 h-4.5 text-accent-foreground" strokeWidth={2} />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-xl text-foreground leading-tight">Pick your name</h2>
            <p className="text-xs text-muted-foreground">We’ll remember you for this session</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-card border border-border p-6">
          <PlayerSelect
            players={playerNames}
            selected={selectedName}
            onSelect={(name: string) => {
              setSelectedName(name);
            }}
          />

          <div className="mt-5">
            <PrimaryButton
              disabled={!selectedPlayer || loading}
              onClick={() => {
                if (!selectedPlayer) return;
                setSelectedPlayer({ playerId: selectedPlayer.id, playerName: selectedPlayer.name });
                router.replace(next);
              }}
            >
              Continue →
            </PrimaryButton>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}
