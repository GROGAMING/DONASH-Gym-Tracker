"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Pencil, Plus, Save, Trash2, X } from "lucide-react";

import AppShell from "@/components/AppShell";
import BackButton from "@/components/BackButton";
import ExerciseCombobox from "@/components/ExerciseCombobox";
import PageContainer from "@/components/PageContainer";
import ToastBanner from "@/components/ToastBanner";
import { PrimaryButton, SecondaryButton } from "@/components/GymButtons";
import { mondayWeekStartISO, mondayFromAnyDateISO } from "@/lib/week";

type ToastState = { message: string; type: "success" | "error" };

type Template = {
  id: string;
  title: string;
  exercises: { id: string; name: string; sort_order: number; target_sets: number | null; target_reps: string | null }[];
  created_at: string;
};

type AssignmentItem = {
  id: string;
  week_start: string;
  template_id: string;
  notes: string;
  created_at: string;
  template: null | {
    id: string;
    title: string;
    exercises: { id: string; name: string; sort_order: number; target_sets: number | null; target_reps: string | null }[];
  };
};

type AssignmentResponse = {
  weekStart: string;
  assignments: AssignmentItem[];
};

function toISODateInputValue(isoYYYYMMDD: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoYYYYMMDD)) return isoYYYYMMDD;
  return mondayWeekStartISO(new Date());
}

export default function AdminSessionsScreen({ teamName }: { teamName: string }) {
  const router = useRouter();

  const [toast, setToast] = useState<ToastState | null>(null);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newExercises, setNewExercises] = useState<{ name: string; target_sets: number | null; target_reps: string }[]>([
    { name: "", target_sets: null, target_reps: "" },
  ]);
  const [creating, setCreating] = useState(false);

  const [weekStartInput, setWeekStartInput] = useState(() => mondayWeekStartISO(new Date()));
  const normalizedWeekStart = useMemo(() => mondayFromAnyDateISO(weekStartInput), [weekStartInput]);

  const [assignment, setAssignment] = useState<AssignmentResponse | null>(null);
  const [loadingAssignment, setLoadingAssignment] = useState(true);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [editTarget, setEditTarget] = useState<Template | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editExercises, setEditExercises] = useState<{ name: string; target_sets: number | null; target_reps: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const startEdit = useCallback((t: Template) => {
    setEditTarget(t);
    setEditTitle(t.title);
    setEditExercises(
      t.exercises.length > 0
        ? t.exercises.map((ex) => ({
            name: ex.name,
            target_sets: ex.target_sets,
            target_reps: ex.target_reps ?? "",
          }))
        : [{ name: "", target_sets: null, target_reps: "" }],
    );
  }, []);

  const cancelEdit = useCallback(() => {
    setEditTarget(null);
    setEditTitle("");
    setEditExercises([]);
  }, []);

  const addEditExerciseRow = useCallback(() => {
    setEditExercises((prev) => [...prev, { name: "", target_sets: null, target_reps: "" }]);
  }, []);

  const removeEditExerciseRow = useCallback((idx: number) => {
    setEditExercises((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    setTemplatesError(null);
    try {
      const res = await fetch("/api/admin/session-templates");
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setTemplatesError(body?.error || "Failed to load templates.");
        setTemplates([]);
        return;
      }
      const data = (await res.json()) as Template[];
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      setTemplatesError("Failed to load templates.");
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editTarget || saving) return;

    const title = editTitle.trim();
    const exercises = editExercises
      .map((x) => ({
        name: x.name.trim(),
        target_sets: typeof x.target_sets === "number" && Number.isFinite(x.target_sets) ? x.target_sets : null,
        target_reps: x.target_reps.trim(),
      }))
      .filter((x) => x.name.length > 0);

    if (!title) {
      setToast({ message: "Add a title.", type: "error" });
      return;
    }
    if (exercises.length === 0) {
      setToast({ message: "Add at least one exercise.", type: "error" });
      return;
    }

    setSaving(true);
    setToast(null);
    try {
      const res = await fetch(`/api/admin/session-templates/${encodeURIComponent(editTarget.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, exercises }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setToast({ message: body?.error || "Failed to save template.", type: "error" });
        return;
      }
      setToast({ message: "Template updated.", type: "success" });
      cancelEdit();
      await fetchTemplates();
    } catch {
      setToast({ message: "Failed to save template.", type: "error" });
    } finally {
      setSaving(false);
    }
  }, [cancelEdit, editExercises, editTarget, editTitle, fetchTemplates, saving]);

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [savingNotesId, setSavingNotesId] = useState<string | null>(null);
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});

  const onBack = useCallback(() => {
    router.push("/admin");
  }, [router]);

  const fetchAssignment = useCallback(async (weekStart: string) => {
    setLoadingAssignment(true);
    setAssignmentError(null);
    try {
      const res = await fetch(`/api/admin/weekly-session?weekStart=${encodeURIComponent(weekStart)}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setAssignmentError(body?.error || "Failed to load weekly assignment.");
        setAssignment(null);
        return;
      }
      const data = (await res.json()) as AssignmentResponse;
      setAssignment(data);
      const initial: Record<string, string> = {};
      for (const a of data.assignments) {
        initial[a.id] = a.notes ?? "";
      }
      setNotesMap(initial);
    } catch {
      setAssignmentError("Failed to load weekly assignment.");
      setAssignment(null);
    } finally {
      setLoadingAssignment(false);
    }
  }, []);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    void fetchAssignment(normalizedWeekStart);
  }, [fetchAssignment, normalizedWeekStart]);

  const addExerciseRow = useCallback(() => {
    setNewExercises((prev) => [...prev, { name: "", target_sets: null, target_reps: "" }]);
  }, []);

  const removeExerciseRow = useCallback((idx: number) => {
    setNewExercises((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const createTemplate = useCallback(async () => {
    if (creating) return;

    const title = newTitle.trim();
    const exercises = newExercises
      .map((x) => ({
        name: x.name.trim(),
        target_sets: typeof x.target_sets === "number" ? x.target_sets : null,
        target_reps: x.target_reps.trim(),
      }))
      .filter((x) => x.name.length > 0)
      .map((x) => ({
        name: x.name,
        target_sets: typeof x.target_sets === "number" && Number.isFinite(x.target_sets) ? x.target_sets : null,
        target_reps: x.target_reps,
      }));

    if (!title) {
      setToast({ message: "Add a title.", type: "error" });
      return;
    }

    if (exercises.length === 0) {
      setToast({ message: "Add at least one exercise.", type: "error" });
      return;
    }

    setCreating(true);
    setToast(null);

    try {
      const res = await fetch("/api/admin/session-templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, exercises }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.error("Create template failed", { status: res.status, body });
        }
        setToast({ message: body?.error || "Failed to create template.", type: "error" });
        return;
      }

      setToast({ message: "Template created.", type: "success" });
      setNewTitle("");
      setNewExercises([{ name: "", target_sets: null, target_reps: "" }]);
      await fetchTemplates();
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error("Create template exception", err);
      }
      setToast({ message: "Failed to create template.", type: "error" });
    } finally {
      setCreating(false);
    }
  }, [creating, fetchTemplates, newExercises, newTitle]);

  const removeAssignment = useCallback(async (assignmentId: string) => {
    if (removingId) return;
    setRemovingId(assignmentId);
    setToast(null);
    try {
      const res = await fetch(`/api/admin/weekly-session/${encodeURIComponent(assignmentId)}`, {
        method: "DELETE",
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setToast({ message: body?.error || "Failed to remove session.", type: "error" });
        return;
      }
      setToast({ message: "Session removed.", type: "success" });
      await fetchAssignment(normalizedWeekStart);
    } catch {
      setToast({ message: "Failed to remove session.", type: "error" });
    } finally {
      setRemovingId(null);
    }
  }, [fetchAssignment, normalizedWeekStart, removingId]);

  const saveNotes = useCallback(async (assignmentId: string) => {
    if (savingNotesId) return;
    setSavingNotesId(assignmentId);
    setToast(null);
    try {
      const res = await fetch(`/api/admin/weekly-session/${encodeURIComponent(assignmentId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notes: notesMap[assignmentId] ?? "" }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setToast({ message: body?.error || "Failed to save notes.", type: "error" });
        return;
      }
      setToast({ message: "Notes saved.", type: "success" });
    } catch {
      setToast({ message: "Failed to save notes.", type: "error" });
    } finally {
      setSavingNotesId(null);
    }
  }, [notesMap, savingNotesId]);

  const deleteTemplate = useCallback(async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setToast(null);
    try {
      const res = await fetch(`/api/admin/session-templates/${encodeURIComponent(deleteTarget.id)}`, {
        method: "DELETE",
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setToast({ message: body?.error || "Failed to delete template.", type: "error" });
        return;
      }
      setToast({ message: "Template deleted.", type: "success" });
      setDeleteTarget(null);
      await fetchTemplates();
    } catch {
      setToast({ message: "Failed to delete template.", type: "error" });
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, deleting, fetchTemplates]);

  const assignWeekly = useCallback(async () => {
    if (assigning) return;

    if (!selectedTemplateId) {
      setToast({ message: "Pick a template first.", type: "error" });
      return;
    }

    setAssigning(true);
    setToast(null);

    try {
      const res = await fetch("/api/admin/weekly-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ weekStart: normalizedWeekStart, templateId: selectedTemplateId }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setToast({ message: body?.error || "Failed to assign session.", type: "error" });
        return;
      }

      setToast({ message: "Weekly session assigned.", type: "success" });
      await fetchAssignment(normalizedWeekStart);
    } catch {
      setToast({ message: "Failed to assign session.", type: "error" });
    } finally {
      setAssigning(false);
    }
  }, [assigning, fetchAssignment, normalizedWeekStart, selectedTemplateId]);

  return (
    <AppShell teamName={teamName}>
      {toast && <ToastBanner message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      <PageContainer className="pt-5 sm:pt-6 pb-8 animate-fade-up">
        <div className="mb-4">
          <BackButton onClick={onBack} />
        </div>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center shadow-card">
            <ClipboardList className="w-4.5 h-4.5 text-foreground" strokeWidth={2} />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-xl text-foreground leading-tight">Sessions</h2>
            <p className="text-xs text-muted-foreground">Create templates and assign this week’s session</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-card p-5">
          <p className="text-xs font-semibold text-muted-foreground mb-3">Create template</p>

          <label className="block text-xs font-semibold text-muted-foreground mb-2">Title</label>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="e.g. Push Day"
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none"
            disabled={creating}
          />

          <div className="mt-4">
            <label className="block text-xs font-semibold text-muted-foreground mb-2">Exercises</label>
            <div className="mt-3 space-y-2">
              {newExercises.map((ex, i) => (
                <div key={`new-ex-${i}`} className="bg-secondary rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-muted-foreground">Exercise {i + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeExerciseRow(i)}
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      disabled={creating || newExercises.length <= 1}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <ExerciseCombobox
                        value={ex.name}
                        onChange={(name) =>
                          setNewExercises((prev) => prev.map((row: typeof prev[number], idx: number) => (idx === i ? { ...row, name } : row)))
                        }
                        disabled={creating}
                        placeholder="Search exercises…"
                      />
                    </div>
                    <input
                      value={typeof ex.target_sets === "number" ? String(ex.target_sets) : ""}
                      onChange={(e) => {
                        const next = e.target.value;
                        const n = next.trim() === "" ? null : Number(next);
                        setNewExercises((prev) =>
                          prev.map((row, idx) => (idx === i ? { ...row, target_sets: Number.isFinite(n as number) ? (n as number) : null } : row)),
                        );
                      }}
                      placeholder="Target sets"
                      inputMode="numeric"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none"
                      disabled={creating}
                    />
                    <input
                      value={ex.target_reps}
                      onChange={(e) =>
                        setNewExercises((prev) => prev.map((row, idx) => (idx === i ? { ...row, target_reps: e.target.value } : row)))
                      }
                      placeholder='Target reps (e.g. "8-10")'
                      className="sm:col-span-3 w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none"
                      disabled={creating}
                    />
                  </div>
                </div>
              ))}

              <div>
                <SecondaryButton type="button" onClick={addExerciseRow} disabled={creating}>
                  <Plus className="w-4 h-4" />
                  Add exercise
                </SecondaryButton>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <PrimaryButton type="button" onClick={() => void createTemplate()} disabled={creating} loading={creating}>
              <Save className="w-4 h-4" />
              Create template
            </PrimaryButton>
          </div>
        </div>

        <div className="mt-6 bg-card border border-border rounded-2xl shadow-card p-5">
          <p className="text-xs font-semibold text-muted-foreground mb-3">Templates</p>

          {loadingTemplates ? (
            <p className="text-sm text-muted-foreground">Loading templates…</p>
          ) : templatesError ? (
            <p className="text-sm text-destructive">{templatesError}</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No templates yet.</p>
          ) : (
            <div className="space-y-3">
              {templates.map((t) =>
                editTarget?.id === t.id ? (
                  // ── Inline edit form ──
                  <div key={t.id} className="border border-border rounded-2xl p-4 bg-background">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <p className="text-xs font-semibold text-muted-foreground">Editing template</p>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={saving}
                        className="shrink-0 flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                    </div>

                    <label className="block text-xs font-semibold text-muted-foreground mb-2">Title</label>
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="e.g. Push Day"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none"
                      disabled={saving}
                    />

                    <div className="mt-4">
                      <label className="block text-xs font-semibold text-muted-foreground mb-2">Exercises</label>
                      <div className="mt-3 space-y-2">
                        {editExercises.map((ex, i) => (
                          <div key={`edit-ex-${i}`} className="bg-secondary rounded-xl px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs font-semibold text-muted-foreground">Exercise {i + 1}</p>
                              <button
                                type="button"
                                onClick={() => removeEditExerciseRow(i)}
                                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                                disabled={saving || editExercises.length <= 1}
                              >
                                Remove
                              </button>
                            </div>
                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div className="sm:col-span-2">
                                <ExerciseCombobox
                                  value={ex.name}
                                  onChange={(name) =>
                                    setEditExercises((prev) => prev.map((row, idx) => (idx === i ? { ...row, name } : row)))
                                  }
                                  disabled={saving}
                                  placeholder="Search exercises…"
                                />
                              </div>
                              <input
                                value={typeof ex.target_sets === "number" ? String(ex.target_sets) : ""}
                                onChange={(e) => {
                                  const next = e.target.value;
                                  const n = next.trim() === "" ? null : Number(next);
                                  setEditExercises((prev) =>
                                    prev.map((row, idx) =>
                                      idx === i ? { ...row, target_sets: Number.isFinite(n as number) ? (n as number) : null } : row,
                                    ),
                                  );
                                }}
                                placeholder="Target sets"
                                inputMode="numeric"
                                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none"
                                disabled={saving}
                              />
                              <input
                                value={ex.target_reps}
                                onChange={(e) =>
                                  setEditExercises((prev) => prev.map((row, idx) => (idx === i ? { ...row, target_reps: e.target.value } : row)))
                                }
                                placeholder='Target reps (e.g. "8-10")'
                                className="sm:col-span-3 w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none"
                                disabled={saving}
                              />
                            </div>
                          </div>
                        ))}
                        <div>
                          <SecondaryButton type="button" onClick={addEditExerciseRow} disabled={saving}>
                            <Plus className="w-4 h-4" />
                            Add exercise
                          </SecondaryButton>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5">
                      <PrimaryButton type="button" onClick={() => void saveEdit()} disabled={saving} loading={saving}>
                        <Save className="w-4 h-4" />
                        Save changes
                      </PrimaryButton>
                    </div>
                  </div>
                ) : (
                  // ── Read-only card ──
                  <div key={t.id} className="border border-border rounded-2xl p-4 bg-background">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{t.title}</p>
                        <p className="text-xs text-muted-foreground">{t.exercises.length} exercise{t.exercises.length === 1 ? "" : "s"}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEdit(t)}
                          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                          disabled={!!editTarget}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(t)}
                          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                    {t.exercises.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {t.exercises.map((ex, i) => (
                          <p key={`${t.id}-${ex.id}`} className="text-xs text-muted-foreground">
                            {i + 1}. {ex.name}
                            {typeof ex.target_sets === "number" || (ex.target_reps ?? "").trim().length > 0
                              ? ` (${typeof ex.target_sets === "number" ? ex.target_sets : "—"} sets x ${ex.target_reps || "—"})`
                              : ""}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          )}
        </div>

        <div className="mt-6 bg-card border border-border rounded-2xl shadow-card p-5">
          <p className="text-xs font-semibold text-muted-foreground mb-3">This week’s session</p>

          <label className="block text-xs font-semibold text-muted-foreground mb-2">Week start</label>
          <input
            type="date"
            value={toISODateInputValue(weekStartInput)}
            onChange={(e) => setWeekStartInput(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none"
          />

          <div className="mt-4">
            <label className="block text-xs font-semibold text-muted-foreground mb-2">Template</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none"
              disabled={loadingTemplates || templates.length === 0}
            >
              <option value="">Select a template…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>

          <div className="mt-5">
            <PrimaryButton type="button" onClick={() => void assignWeekly()} disabled={assigning} loading={assigning}>
              Assign
            </PrimaryButton>
          </div>

          <div className="mt-5">
            {loadingAssignment ? (
              <p className="text-sm text-muted-foreground">Loading current assignments…</p>
            ) : assignmentError ? (
              <p className="text-sm text-destructive">{assignmentError}</p>
            ) : !assignment || assignment.assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sessions assigned for this week.</p>
            ) : (
              <div className="space-y-3">
                {assignment.assignments.map((a) => (
                  <div key={a.id} className="border border-border rounded-2xl p-4 bg-background">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{a.template?.title ?? "Unknown template"}</p>
                        <p className="text-xs text-muted-foreground">Week starting {a.week_start}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void removeAssignment(a.id)}
                        disabled={removingId === a.id}
                        className="shrink-0 flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {removingId === a.id ? "Removing…" : "Remove"}
                      </button>
                    </div>
                    {a.template && a.template.exercises.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {a.template.exercises.map((ex, i) => (
                          <p key={`${a.id}-${ex.id}`} className="text-xs text-muted-foreground">
                            {i + 1}. {ex.name}
                            {typeof ex.target_sets === "number" || (ex.target_reps ?? "").trim().length > 0
                              ? ` (${typeof ex.target_sets === "number" ? ex.target_sets : "—"} sets x ${ex.target_reps || "—"})`
                              : ""}
                          </p>
                        ))}
                      </div>
                    )}
                    <div className="mt-3">
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Notes</label>
                      <textarea
                        value={notesMap[a.id] ?? ""}
                        onChange={(e) => setNotesMap((prev) => ({ ...prev, [a.id]: e.target.value }))}
                        placeholder="Add a note visible to players…"
                        rows={2}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm outline-none resize-none"
                      />
                      <div className="mt-1.5">
                        <SecondaryButton
                          type="button"
                          onClick={() => void saveNotes(a.id)}
                          disabled={savingNotesId === a.id}
                        >
                          {savingNotesId === a.id ? "Saving…" : "Save notes"}
                        </SecondaryButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PageContainer>

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-card w-full max-w-sm p-6">
            <h3 className="font-display font-bold text-lg text-foreground mb-2">Delete template?</h3>
            <p className="text-sm text-muted-foreground mb-1">
              <span className="font-semibold text-foreground">{deleteTarget.title}</span>
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
                onClick={() => void deleteTemplate()}
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
