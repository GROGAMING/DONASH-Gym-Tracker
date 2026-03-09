"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, UserPlus, Users } from "lucide-react";

import AppShell from "@/components/AppShell";
import BackButton from "@/components/BackButton";
import PageContainer from "@/components/PageContainer";
import ToastBanner from "@/components/ToastBanner";
import { PrimaryButton, SecondaryButton } from "@/components/GymButtons";

type Player = { id: string; name: string };
type ToastState = { message: string; type: "success" | "error" };

export default function ManageTeamScreen({ teamName }: { teamName: string }) {
  const router = useRouter();

  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [playersError, setPlayersError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const [confirmRemove, setConfirmRemove] = useState<Player | null>(null);
  const [removing, setRemoving] = useState(false);

  const [toast, setToast] = useState<ToastState | null>(null);

  const fetchPlayers = useCallback(async () => {
    setLoadingPlayers(true);
    setPlayersError(null);
    try {
      const res = await fetch("/api/players");
      if (!res.ok) {
        const b = (await res.json().catch(() => null)) as { error?: string } | null;
        setPlayersError(b?.error || "Failed to load players.");
        return;
      }
      const data = (await res.json()) as Player[];
      setPlayers(data);
    } catch {
      setPlayersError("Failed to load players.");
    } finally {
      setLoadingPlayers(false);
    }
  }, []);

  useEffect(() => { void fetchPlayers(); }, [fetchPlayers]);

  const addPlayer = useCallback(async () => {
    const name = newName.trim();
    if (!name || adding) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/players", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string; name?: string } | null;
      if (!res.ok) {
        setToast({ message: body?.error || "Failed to add player.", type: "error" });
        return;
      }
      setToast({ message: `${body?.name ?? name} added to the squad.`, type: "success" });
      setNewName("");
      void fetchPlayers();
    } catch {
      setToast({ message: "Failed to add player.", type: "error" });
    } finally {
      setAdding(false);
    }
  }, [newName, adding, fetchPlayers]);

  const confirmAndRemove = useCallback(async () => {
    if (!confirmRemove || removing) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/admin/players/${confirmRemove.id}`, { method: "DELETE" });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setToast({ message: body?.error || "Failed to remove player.", type: "error" });
        return;
      }
      setToast({ message: `${confirmRemove.name} removed from team.`, type: "success" });
      setConfirmRemove(null);
      void fetchPlayers();
    } catch {
      setToast({ message: "Failed to remove player.", type: "error" });
    } finally {
      setRemoving(false);
    }
  }, [confirmRemove, removing, fetchPlayers]);

  const onBack = useCallback(() => { router.push("/admin"); }, [router]);

  return (
    <AppShell teamName={teamName}>
      {toast && (
        <ToastBanner
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

      <PageContainer className="pt-5 pb-10 animate-fade-up">
        <div className="mb-5">
          <BackButton onClick={onBack} label="Admin" />
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-xl text-foreground leading-tight">Manage team</h1>
            <p className="text-xs text-muted-foreground">Add or remove players from the squad</p>
          </div>
        </div>

        {/* Add player */}
        <div className="bg-card border border-border rounded-2xl shadow-card p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Add player</p>
          </div>
          <input
            type="text"
            placeholder="Player name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void addPlayer(); }}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-foreground/10 mb-3"
          />
          <PrimaryButton onClick={() => void addPlayer()} loading={adding} disabled={!newName.trim()}>
            Add to squad
          </PrimaryButton>
        </div>

        {/* Roster */}
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-sm font-semibold text-foreground">
              Squad roster
              {!loadingPlayers && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {players.length} player{players.length !== 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>

          {loadingPlayers ? (
            <div className="px-5 py-6 text-sm text-muted-foreground">Loading…</div>
          ) : playersError ? (
            <div className="px-5 py-6 text-sm text-destructive">{playersError}</div>
          ) : players.length === 0 ? (
            <div className="px-5 py-6 text-sm text-muted-foreground">No players yet.</div>
          ) : (
            <ul>
              {players.map((p, i) => (
                <li
                  key={p.id}
                  className={
                    "flex items-center justify-between gap-3 px-5 py-3 " +
                    (i < players.length - 1 ? "border-b border-border" : "")
                  }
                >
                  <span className="text-sm font-medium text-foreground truncate">{p.name}</span>
                  <SecondaryButton
                    onClick={() => setConfirmRemove(p)}
                    className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </SecondaryButton>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PageContainer>

      {/* Confirmation modal */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-card border border-border rounded-3xl shadow-card-hover p-6 animate-fade-up">
            <h2 className="font-display font-extrabold text-lg text-foreground mb-2">Remove player?</h2>
            <p className="text-sm text-muted-foreground mb-1">
              Remove <span className="font-semibold text-foreground">{confirmRemove.name}</span> from the team?
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              This does not delete their history. Their session logs and uploads are preserved.
            </p>
            <div className="flex flex-col gap-2">
              <PrimaryButton
                onClick={() => void confirmAndRemove()}
                loading={removing}
                className="bg-destructive text-destructive-foreground hover:opacity-90"
              >
                Yes, remove from team
              </PrimaryButton>
              <SecondaryButton onClick={() => setConfirmRemove(null)} disabled={removing}>
                Cancel
              </SecondaryButton>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
