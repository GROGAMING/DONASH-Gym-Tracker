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

      <PageContainer className="pt-8 sm:pt-12 pb-8 animate-fade-up">
        <div className="mb-7">
          <div className="w-12 h-12 rounded-2xl bg-foreground flex items-center justify-center shadow-button mb-4">
            <UserRound className="w-5 h-5 text-background" strokeWidth={2} />
          </div>
          <h2 className="font-display font-extrabold text-2xl text-foreground leading-tight">Pick your name</h2>
          <p className="text-sm text-muted-foreground mt-1">We'll remember you for this session</p>
        </div>

        <div className="bg-card rounded-2xl shadow-card border border-border p-5">
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
