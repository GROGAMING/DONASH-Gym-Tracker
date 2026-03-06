"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Plus, Trash2 } from "lucide-react";

import AppShell from "@/components/AppShell";
import BackButton from "@/components/BackButton";
import PageContainer from "@/components/PageContainer";
import ToastBanner from "@/components/ToastBanner";
import { PrimaryButton, SecondaryButton } from "@/components/GymButtons";

type ToastState = { message: string; type: "success" | "error" };

type Exercise = { id: string; name: string; category: string };

const CATEGORIES = [
  "Barbell",
  "Dumbbell",
  "Machine",
  "Bodyweight",
  "Cable",
  "Cardio",
  "Stretching",
  "Other",
];

export default function AdminExercisesScreen({ teamName }: { teamName: string }) {
  const router = useRouter();

  const [toast, setToast] = useState<ToastState | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [creating, setCreating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Exercise | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchExercises = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/exercise-library?q=");
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error || "Failed to load exercises.");
        setExercises([]);
        return;
      }
      const data = (await res.json()) as Exercise[];
      setExercises(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load exercises.");
      setExercises([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchExercises(); }, [fetchExercises]);

  const createExercise = useCallback(async () => {
    if (creating) return;
    const name = newName.trim();
    if (!name) { setToast({ message: "Enter a name.", type: "error" }); return; }
    setCreating(true);
    setToast(null);
    try {
      const res = await fetch("/api/admin/exercise-library", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, category: newCategory }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok && res.status !== 200) {
        setToast({ message: body?.error || "Failed to create exercise.", type: "error" });
        return;
      }
      setToast({ message: "Exercise saved.", type: "success" });
      setNewName("");
      setNewCategory("");
      await fetchExercises();
    } catch {
      setToast({ message: "Failed to create exercise.", type: "error" });
    } finally {
      setCreating(false);
    }
  }, [creating, fetchExercises, newCategory, newName]);

  const deleteExercise = useCallback(async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setToast(null);
    try {
      const res = await fetch(`/api/admin/exercise-library/${encodeURIComponent(deleteTarget.id)}`, {
        method: "DELETE",
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setToast({ message: body?.error || "Failed to delete exercise.", type: "error" });
        return;
      }
      setToast({ message: "Exercise deleted.", type: "success" });
      setDeleteTarget(null);
      await fetchExercises();
    } catch {
      setToast({ message: "Failed to delete exercise.", type: "error" });
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, deleting, fetchExercises]);

  return (
    <AppShell teamName={teamName}>
      {toast && <ToastBanner message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      <PageContainer className="pt-5 sm:pt-6 pb-8 animate-fade-up">
        <div className="mb-4">
          <BackButton onClick={() => router.push("/admin")} />
        </div>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center shadow-card">
            <Dumbbell className="w-4.5 h-4.5 text-foreground" strokeWidth={2} />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-xl text-foreground leading-tight">Exercises</h2>
            <p className="text-xs text-muted-foreground">Master exercise library</p>
          </div>
        </div>

        {/* Create form */}
        <div className="bg-card border border-border rounded-2xl shadow-card p-5 mb-6">
          <p className="text-xs font-semibold text-muted-foreground mb-3">Add exercise</p>

          <label className="block text-xs font-semibold text-muted-foreground mb-1">Name</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void createExercise(); }}
            placeholder="e.g. Barbell Back Squat"
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none mb-3"
            disabled={creating}
          />

          <label className="block text-xs font-semibold text-muted-foreground mb-1">Category</label>
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none mb-4"
            disabled={creating}
          >
            <option value="">Select category…</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <PrimaryButton type="button" onClick={() => void createExercise()} disabled={creating} loading={creating}>
            <Plus className="w-4 h-4" />
            Add exercise
          </PrimaryButton>
        </div>

        {/* List */}
        <div className="bg-card border border-border rounded-2xl shadow-card p-5">
          <p className="text-xs font-semibold text-muted-foreground mb-3">
            All exercises {!loading && `(${exercises.length})`}
          </p>

          {loading ? (
            <div className="space-y-2 animate-pulse">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-10 bg-secondary rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive">{error}</p>
              <SecondaryButton type="button" onClick={() => void fetchExercises()}>Retry</SecondaryButton>
            </div>
          ) : exercises.length === 0 ? (
            <p className="text-sm text-muted-foreground">No exercises yet. Add one above.</p>
          ) : (
            <div className="space-y-1">
              {exercises.map((ex) => (
                <div
                  key={ex.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{ex.name}</p>
                    {ex.category && (
                      <p className="text-xs text-muted-foreground">{ex.category}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(ex)}
                    className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                    aria-label={`Delete ${ex.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageContainer>

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-card w-full max-w-sm p-6">
            <h3 className="font-display font-bold text-lg text-foreground mb-2">Delete exercise?</h3>
            <p className="text-sm text-muted-foreground mb-1">
              <span className="font-semibold text-foreground">{deleteTarget.name}</span>
            </p>
            <p className="text-xs text-muted-foreground mb-6">This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm font-semibold hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void deleteExercise()}
                disabled={deleting}
                className="flex-1 px-4 py-3 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
