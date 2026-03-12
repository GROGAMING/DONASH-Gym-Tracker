"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, ClipboardList, GripVertical, Info, Pencil, Plus, Save, Trash2, X } from "lucide-react";

import AppShell from "@/components/AppShell";
import BackButton from "@/components/BackButton";
import ExerciseCombobox from "@/components/ExerciseCombobox";
import PageContainer from "@/components/PageContainer";
import ToastBanner from "@/components/ToastBanner";
import { PrimaryButton, SecondaryButton } from "@/components/GymButtons";
import { mondayWeekStartISO, mondayFromAnyDateISO } from "@/lib/week";

type ToastState = { message: string; type: "success" | "error" };

// ─── Block colour tokens ───────────────────────────────────────────────────
export type BlockColor = "warmup" | "a" | "b" | "c" | "conditioning" | "extra";

const BLOCK_PRESETS: { color: BlockColor; label: string }[] = [
  { color: "warmup",       label: "Warm Up / Mobility" },
  { color: "a",            label: "Block A" },
  { color: "b",            label: "Block B" },
  { color: "c",            label: "Block C" },
  { color: "conditioning", label: "Conditioning" },
  { color: "extra",        label: "Extra Block" },
];

const BLOCK_COLORS: Record<BlockColor, { bg: string; border: string; text: string; dot: string }> = {
  warmup:       { bg: "bg-zinc-100 dark:bg-zinc-800",   border: "border-zinc-300 dark:border-zinc-600",  text: "text-zinc-700 dark:text-zinc-300",  dot: "bg-zinc-400" },
  a:            { bg: "bg-emerald-50 dark:bg-emerald-950", border: "border-emerald-300 dark:border-emerald-700", text: "text-emerald-800 dark:text-emerald-300", dot: "bg-emerald-500" },
  b:            { bg: "bg-blue-50 dark:bg-blue-950",    border: "border-blue-300 dark:border-blue-700",  text: "text-blue-800 dark:text-blue-300",  dot: "bg-blue-500" },
  c:            { bg: "bg-purple-50 dark:bg-purple-950",border: "border-purple-300 dark:border-purple-700",text: "text-purple-800 dark:text-purple-300",dot: "bg-purple-500" },
  conditioning: { bg: "bg-orange-50 dark:bg-orange-950",border: "border-orange-300 dark:border-orange-700",text: "text-orange-800 dark:text-orange-300",dot: "bg-orange-500" },
  extra:        { bg: "bg-pink-50 dark:bg-pink-950",    border: "border-pink-300 dark:border-pink-700",  text: "text-pink-800 dark:text-pink-300",  dot: "bg-pink-500" },
};

// ─── Group type ───────────────────────────────────────────────────────────
type GroupType = "standard" | "superset" | "triset";

// ─── Exercise row (within a block) ────────────────────────────────────────
type ExerciseRow = {
  _key: string;
  name: string;
  // Strength fields
  target_sets: number | null;
  target_reps: string;
  // Conditioning fields (only used when block.color === "conditioning")
  cond_rounds: string;
  cond_work: string;
  cond_rest: string;
  cond_distance: string;
  cond_notes: string;
  coaching_notes: string;
};

// ─── Block (container of exercises) ───────────────────────────────────────
type Block = {
  _key: string;
  label: string;
  color: BlockColor;
  rest_seconds: number | null; // stored as seconds, edited as minutes
  group_type: GroupType;
  exercises: ExerciseRow[];
};

function newKey() { return `${Date.now()}-${Math.random()}`; }

function newExerciseRow(): ExerciseRow {
  return { _key: newKey(), name: "", target_sets: null, target_reps: "", cond_rounds: "", cond_work: "", cond_rest: "", cond_distance: "", cond_notes: "", coaching_notes: "" };
}

function newBlock(preset: { color: BlockColor; label: string }): Block {
  return { _key: newKey(), label: preset.label, color: preset.color, rest_seconds: null, group_type: "standard", exercises: [newExerciseRow()] };
}

// Encode group_type into block_label using a || separator
function encodeBlockLabel(label: string, group_type: GroupType): string {
  if (group_type === "standard") return label;
  return `${label}||${group_type}`;
}

function decodeBlockLabel(encoded: string): { label: string; group_type: GroupType } {
  const sep = encoded.indexOf("||");
  if (sep === -1) return { label: encoded, group_type: "standard" };
  const gt = encoded.slice(sep + 2) as GroupType;
  const validGt: GroupType[] = ["standard", "superset", "triset"];
  return { label: encoded.slice(0, sep), group_type: validGt.includes(gt) ? gt : "standard" };
}

// Encode conditioning fields into target_reps as JSON when block is conditioning
function encodeCondReps(ex: ExerciseRow, isConditioning: boolean): string {
  if (!isConditioning) return ex.target_reps.trim();
  const obj = {
    rounds: ex.cond_rounds.trim(),
    work: ex.cond_work.trim(),
    rest: ex.cond_rest.trim(),
    distance: ex.cond_distance.trim(),
    notes: ex.cond_notes.trim(),
  };
  return JSON.stringify(obj);
}

function decodeCondReps(target_reps: string | null, isConditioning: boolean): Partial<ExerciseRow> {
  if (!isConditioning || !target_reps) return { target_reps: target_reps ?? "" };
  try {
    const obj = JSON.parse(target_reps) as Record<string, string>;
    if (typeof obj === "object" && obj !== null && ("rounds" in obj || "work" in obj)) {
      return { cond_rounds: obj.rounds ?? "", cond_work: obj.work ?? "", cond_rest: obj.rest ?? "", cond_distance: obj.distance ?? "", cond_notes: obj.notes ?? "", target_reps: "" };
    }
  } catch { /* not JSON, treat as plain reps */ }
  return { target_reps: target_reps };
}

// Flatten blocks → flat exercise array for API
function blocksToExercises(blocks: Block[]) {
  const rows: {
    name: string;
    target_sets: number | null;
    target_reps: string;
    block_label: string;
    block_color: string;
    group_index: number;
    coaching_notes: string | null;
    rest_seconds: number | null;
  }[] = [];
  for (const block of blocks) {
    const isConditioning = block.color === "conditioning";
    const encodedLabel = encodeBlockLabel(block.label, block.group_type);
    for (let gi = 0; gi < block.exercises.length; gi++) {
      const ex = block.exercises[gi];
      if (!ex.name.trim()) continue;
      rows.push({
        name: ex.name.trim(),
        target_sets: isConditioning ? null : (typeof ex.target_sets === "number" && Number.isFinite(ex.target_sets) ? ex.target_sets : null),
        target_reps: encodeCondReps(ex, isConditioning),
        block_label: encodedLabel,
        block_color: block.color,
        group_index: gi,
        coaching_notes: ex.coaching_notes.trim() || null,
        rest_seconds: block.rest_seconds,
      });
    }
  }
  return rows;
}

// Reconstruct blocks from flat exercise array (from API)
function exercisesToBlocks(exercises: TemplateExercise[]): Block[] {
  const blockMap = new Map<string, Block>();
  const order: string[] = [];
  for (const ex of exercises) {
    const rawLabel = ex.block_label ?? "Block A";
    const { label, group_type } = decodeBlockLabel(rawLabel);
    const color = (ex.block_color as BlockColor | undefined) ?? "a";
    const isConditioning = color === "conditioning";
    const key = rawLabel;
    if (!blockMap.has(key)) {
      blockMap.set(key, { _key: newKey(), label, color, rest_seconds: ex.rest_seconds ?? null, group_type, exercises: [] });
      order.push(key);
    }
    const block = blockMap.get(key)!;
    const condFields = decodeCondReps(ex.target_reps, isConditioning);
    block.exercises.push({
      _key: newKey(),
      name: ex.name,
      target_sets: ex.target_sets,
      target_reps: condFields.target_reps ?? ex.target_reps ?? "",
      cond_rounds: condFields.cond_rounds ?? "",
      cond_work: condFields.cond_work ?? "",
      cond_rest: condFields.cond_rest ?? "",
      cond_distance: condFields.cond_distance ?? "",
      cond_notes: condFields.cond_notes ?? "",
      coaching_notes: ex.coaching_notes ?? "",
    });
  }
  if (order.length === 0) {
    return [newBlock(BLOCK_PRESETS[1])];
  }
  return order.map((k) => blockMap.get(k)!);
}

type TemplateExercise = {
  id: string;
  name: string;
  sort_order: number;
  target_sets: number | null;
  target_reps: string | null;
  block_label: string | null;
  block_color: string | null;
  group_index: number;
  coaching_notes: string | null;
  rest_seconds: number | null;
};

type Template = {
  id: string;
  title: string;
  exercises: TemplateExercise[];
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
    exercises: TemplateExercise[];
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

// ─── BlockBuilder: shared component for create + edit ─────────────────────
const GROUP_TYPE_OPTIONS: { value: GroupType; label: string }[] = [
  { value: "standard",  label: "Standard" },
  { value: "superset",  label: "Superset" },
  { value: "triset",    label: "Tri-set" },
];

function restMinsToSeconds(mins: string): number | null {
  const v = mins.trim();
  if (v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 60);
}

function restSecondsToMins(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return "";
  const mins = seconds / 60;
  return Number.isInteger(mins) ? String(mins) : String(Math.round(mins * 10) / 10);
}

function BlockBuilder({
  blocks,
  setBlocks,
  disabled,
}: {
  blocks: Block[];
  setBlocks: React.Dispatch<React.SetStateAction<Block[]>>;
  disabled: boolean;
}) {
  const updateBlock = (bKey: string, patch: Partial<Block>) =>
    setBlocks((prev: Block[]) => prev.map((b: Block) => b._key === bKey ? { ...b, ...patch } : b));

  const removeBlock = (bKey: string) =>
    setBlocks((prev: Block[]) => prev.filter((b: Block) => b._key !== bKey));

  const moveBlock = (bKey: string, dir: -1 | 1) =>
    setBlocks((prev: Block[]) => {
      const idx = prev.findIndex((b: Block) => b._key === bKey);
      if (idx < 0) return prev;
      const next = [...prev];
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });

  const updateExercise = (bKey: string, eKey: string, patch: Partial<ExerciseRow>) =>
    setBlocks((prev: Block[]) => prev.map((b: Block) =>
      b._key === bKey
        ? { ...b, exercises: b.exercises.map((e: ExerciseRow) => e._key === eKey ? { ...e, ...patch } : e) }
        : b,
    ));

  const addExercise = (bKey: string) =>
    setBlocks((prev: Block[]) => prev.map((b: Block) =>
      b._key === bKey ? { ...b, exercises: [...b.exercises, newExerciseRow()] } : b,
    ));

  const removeExercise = (bKey: string, eKey: string) =>
    setBlocks((prev: Block[]) => prev.map((b: Block) =>
      b._key === bKey ? { ...b, exercises: b.exercises.filter((e: ExerciseRow) => e._key !== eKey) } : b,
    ));

  const moveExercise = (bKey: string, eKey: string, dir: -1 | 1) =>
    setBlocks((prev: Block[]) => prev.map((b: Block) => {
      if (b._key !== bKey) return b;
      const idx = b.exercises.findIndex((e: ExerciseRow) => e._key === eKey);
      if (idx < 0) return b;
      const next = [...b.exercises];
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= next.length) return b;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return { ...b, exercises: next };
    }));

  return (
    <div className="space-y-4">
      {blocks.map((block, bi) => {
        const col = BLOCK_COLORS[block.color] ?? BLOCK_COLORS.a;
        const isConditioning = block.color === "conditioning";
        const exLabel = isConditioning ? "Entry" : "Exercise";
        const gtLabel = block.group_type === "superset" ? "Superset" : block.group_type === "triset" ? "Tri-set" : null;
        return (
          <div key={block._key} className={`rounded-2xl border-2 ${col.border} ${col.bg} overflow-hidden`}>
            {/* Block header */}
            <div className={`px-3 py-2.5 border-b ${col.border}`}>
              {/* Row 1: dot + name + color select */}
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${col.dot}`} />
                <input
                  value={block.label}
                  onChange={(e) => updateBlock(block._key, { label: e.target.value })}
                  disabled={disabled}
                  className={`flex-1 min-w-0 text-sm font-bold bg-transparent outline-none ${col.text} placeholder:text-current placeholder:opacity-40`}
                  placeholder="Block name…"
                />
                <select
                  value={block.color}
                  onChange={(e) => updateBlock(block._key, { color: e.target.value as BlockColor })}
                  disabled={disabled}
                  className={`shrink-0 text-xs bg-transparent border border-current/20 rounded-lg px-1.5 py-1 outline-none ${col.text} max-w-[110px]`}
                >
                  {BLOCK_PRESETS.map((p) => (
                    <option key={p.color} value={p.color}>{p.label}</option>
                  ))}
                </select>
              </div>
              {/* Row 2: action buttons */}
              <div className="flex items-center gap-1 mt-1.5 pl-4">
                <button type="button" onClick={() => moveBlock(block._key, -1)} disabled={disabled || bi === 0}
                  className="p-1 rounded-lg hover:bg-black/10 disabled:opacity-30 transition-colors">
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => moveBlock(block._key, 1)} disabled={disabled || bi === blocks.length - 1}
                  className="p-1 rounded-lg hover:bg-black/10 disabled:opacity-30 transition-colors">
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => removeBlock(block._key)} disabled={disabled || blocks.length <= 1}
                  className="p-1 rounded-lg hover:bg-black/10 disabled:opacity-30 transition-colors text-red-500 ml-auto">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Block settings row */}
            <div className={`px-3 py-2 border-b ${col.border} space-y-2`}>
              {/* Group type — only for non-conditioning */}
              {!isConditioning && (
                <div className="flex items-center gap-1 flex-wrap">
                  <span className={`text-xs ${col.text} opacity-70 shrink-0 mr-1`}>Type:</span>
                  {GROUP_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => updateBlock(block._key, { group_type: opt.value })}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                        block.group_type === opt.value
                          ? `bg-black/10 border-current/30 ${col.text}`
                          : "border-transparent text-muted-foreground hover:bg-black/5"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
              {/* Rest between sets */}
              <div className="flex items-center gap-2">
                <label className={`text-xs ${col.text} opacity-70 shrink-0`}>Rest between sets:</label>
                <input
                  value={restSecondsToMins(block.rest_seconds)}
                  onChange={(e) => updateBlock(block._key, { rest_seconds: restMinsToSeconds(e.target.value) })}
                  placeholder="—"
                  inputMode="decimal"
                  disabled={disabled}
                  className="w-14 px-2 py-1 rounded-lg border border-border bg-background text-foreground text-xs outline-none text-center"
                />
                <span className={`text-xs ${col.text} opacity-70`}>mins</span>
              </div>
            </div>

            {/* Exercises inside block */}
            <div className="px-4 py-3 space-y-3">
              {block.exercises.map((ex, ei) => (
                <div key={ex._key} className="bg-white/60 dark:bg-black/20 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-2 min-w-0">
                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs font-semibold text-muted-foreground flex-1 min-w-0 truncate">
                      {gtLabel && block.exercises.length > 1
                        ? `${gtLabel} — ${exLabel} ${ei + 1}`
                        : block.exercises.length > 1
                        ? `${exLabel} ${ei + 1} of ${block.exercises.length}`
                        : exLabel}
                    </span>
                    <button type="button" onClick={() => moveExercise(block._key, ex._key, -1)} disabled={disabled || ei === 0}
                      className="shrink-0 p-1 rounded hover:bg-black/10 disabled:opacity-30">
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button type="button" onClick={() => moveExercise(block._key, ex._key, 1)} disabled={disabled || ei === block.exercises.length - 1}
                      className="shrink-0 p-1 rounded hover:bg-black/10 disabled:opacity-30">
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    <button type="button" onClick={() => removeExercise(block._key, ex._key)} disabled={disabled || block.exercises.length <= 1}
                      className="shrink-0 p-1 rounded hover:bg-black/10 disabled:opacity-30 text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  <ExerciseCombobox
                    value={ex.name}
                    onChange={(name) => updateExercise(block._key, ex._key, { name })}
                    disabled={disabled}
                    placeholder={isConditioning ? "e.g. Assault Bike, Run 400m…" : "Search exercises…"}
                  />

                  {isConditioning ? (
                    /* ── Conditioning fields ── */
                    <div className="mt-2 space-y-2">
                      <input
                        value={ex.cond_rounds}
                        onChange={(e) => updateExercise(block._key, ex._key, { cond_rounds: e.target.value })}
                        placeholder="Rounds / intervals"
                        disabled={disabled}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm outline-none"
                      />
                      <input
                        value={ex.cond_distance}
                        onChange={(e) => updateExercise(block._key, ex._key, { cond_distance: e.target.value })}
                        placeholder="Distance (e.g. 400m)"
                        disabled={disabled}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm outline-none"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={ex.cond_work}
                          onChange={(e) => updateExercise(block._key, ex._key, { cond_work: e.target.value })}
                          placeholder="Work (e.g. 30s)"
                          disabled={disabled}
                          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm outline-none"
                        />
                        <input
                          value={ex.cond_rest}
                          onChange={(e) => updateExercise(block._key, ex._key, { cond_rest: e.target.value })}
                          placeholder="Rest (e.g. 30s)"
                          disabled={disabled}
                          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm outline-none"
                        />
                      </div>
                      <input
                        value={ex.cond_notes}
                        onChange={(e) => updateExercise(block._key, ex._key, { cond_notes: e.target.value })}
                        placeholder="Intensity / notes"
                        disabled={disabled}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm outline-none"
                      />
                    </div>
                  ) : (
                    /* ── Strength fields ── */
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <input
                        value={typeof ex.target_sets === "number" ? String(ex.target_sets) : ""}
                        onChange={(e) => {
                          const v = e.target.value.trim();
                          const n = v === "" ? null : Number(v);
                          updateExercise(block._key, ex._key, { target_sets: Number.isFinite(n as number) ? (n as number) : null });
                        }}
                        placeholder="Sets"
                        inputMode="numeric"
                        disabled={disabled}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm outline-none"
                      />
                      <input
                        value={ex.target_reps}
                        onChange={(e) => updateExercise(block._key, ex._key, { target_reps: e.target.value })}
                        placeholder="Reps"
                        disabled={disabled}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm outline-none"
                      />
                    </div>
                  )}

                  <div className="mt-2 relative">
                    <Info className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    <input
                      value={ex.coaching_notes}
                      onChange={(e) => updateExercise(block._key, ex._key, { coaching_notes: e.target.value })}
                      placeholder="Coaching note (optional)…"
                      disabled={disabled}
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none"
                    />
                  </div>
                </div>
              ))}

              <SecondaryButton type="button" onClick={() => addExercise(block._key)} disabled={disabled}>
                <Plus className="w-3.5 h-3.5" />
                Add {exLabel.toLowerCase()}
              </SecondaryButton>
            </div>
          </div>
        );
      })}

      {/* Add block buttons */}
      <div className="flex flex-wrap gap-2">
        {BLOCK_PRESETS.map((p) => (
          <SecondaryButton
            key={p.color}
            type="button"
            disabled={disabled}
            onClick={() => setBlocks((prev: Block[]) => [...prev, newBlock(p)])}
          >
            <Plus className="w-3.5 h-3.5" />
            {p.label}
          </SecondaryButton>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
export default function AdminSessionsScreen({ teamName }: { teamName: string }) {
  const router = useRouter();

  const [toast, setToast] = useState<ToastState | null>(null);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  // ── Create form state ──
  const [newTitle, setNewTitle] = useState("");
  const [newBlocks, setNewBlocks] = useState<Block[]>([newBlock(BLOCK_PRESETS[1])]);
  const [creating, setCreating] = useState(false);

  // ── Edit form state ──
  const [editTarget, setEditTarget] = useState<Template | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBlocks, setEditBlocks] = useState<Block[]>([]);
  const [saving, setSaving] = useState(false);

  // ── Weekly assignment state ──
  const [weekStartInput, setWeekStartInput] = useState(() => mondayWeekStartISO(new Date()));
  const normalizedWeekStart = useMemo(() => mondayFromAnyDateISO(weekStartInput), [weekStartInput]);
  const [assignment, setAssignment] = useState<AssignmentResponse | null>(null);
  const [loadingAssignment, setLoadingAssignment] = useState(true);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [savingNotesId, setSavingNotesId] = useState<string | null>(null);
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});

  // ── Delete ──
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      for (const a of data.assignments) initial[a.id] = a.notes ?? "";
      setNotesMap(initial);
    } catch {
      setAssignmentError("Failed to load weekly assignment.");
      setAssignment(null);
    } finally {
      setLoadingAssignment(false);
    }
  }, []);

  useEffect(() => { void fetchTemplates(); }, [fetchTemplates]);
  useEffect(() => { void fetchAssignment(normalizedWeekStart); }, [fetchAssignment, normalizedWeekStart]);

  const startEdit = useCallback((t: Template) => {
    setEditTarget(t);
    setEditTitle(t.title);
    setEditBlocks(exercisesToBlocks(t.exercises));
  }, []);

  const cancelEdit = useCallback(() => {
    setEditTarget(null);
    setEditTitle("");
    setEditBlocks([]);
  }, []);

  const createTemplate = useCallback(async () => {
    if (creating) return;
    const title = newTitle.trim();
    const exercises = blocksToExercises(newBlocks);
    if (!title) { setToast({ message: "Add a title.", type: "error" }); return; }
    if (exercises.length === 0) { setToast({ message: "Add at least one exercise.", type: "error" }); return; }
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
        setToast({ message: body?.error || "Failed to create template.", type: "error" });
        return;
      }
      setToast({ message: "Template created.", type: "success" });
      setNewTitle("");
      setNewBlocks([newBlock(BLOCK_PRESETS[1])]);
      await fetchTemplates();
    } catch {
      setToast({ message: "Failed to create template.", type: "error" });
    } finally {
      setCreating(false);
    }
  }, [creating, fetchTemplates, newBlocks, newTitle]);

  const saveEdit = useCallback(async () => {
    if (!editTarget || saving) return;
    const title = editTitle.trim();
    const exercises = blocksToExercises(editBlocks);
    if (!title) { setToast({ message: "Add a title.", type: "error" }); return; }
    if (exercises.length === 0) { setToast({ message: "Add at least one exercise.", type: "error" }); return; }
    setSaving(true);
    setToast(null);
    try {
      const res = await fetch(`/api/admin/session-templates/${encodeURIComponent(editTarget.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, exercises }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) { setToast({ message: body?.error || "Failed to save template.", type: "error" }); return; }
      setToast({ message: "Template updated.", type: "success" });
      cancelEdit();
      await fetchTemplates();
    } catch {
      setToast({ message: "Failed to save template.", type: "error" });
    } finally {
      setSaving(false);
    }
  }, [cancelEdit, editBlocks, editTarget, editTitle, fetchTemplates, saving]);

  const deleteTemplate = useCallback(async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setToast(null);
    try {
      const res = await fetch(`/api/admin/session-templates/${encodeURIComponent(deleteTarget.id)}`, { method: "DELETE" });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) { setToast({ message: body?.error || "Failed to delete template.", type: "error" }); return; }
      setToast({ message: "Template deleted.", type: "success" });
      setDeleteTarget(null);
      await fetchTemplates();
    } catch {
      setToast({ message: "Failed to delete template.", type: "error" });
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, deleting, fetchTemplates]);

  const removeAssignment = useCallback(async (assignmentId: string) => {
    if (removingId) return;
    setRemovingId(assignmentId);
    setToast(null);
    try {
      const res = await fetch(`/api/admin/weekly-session/${encodeURIComponent(assignmentId)}`, { method: "DELETE" });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) { setToast({ message: body?.error || "Failed to remove session.", type: "error" }); return; }
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
      if (!res.ok) { setToast({ message: body?.error || "Failed to save notes.", type: "error" }); return; }
      setToast({ message: "Notes saved.", type: "success" });
    } catch {
      setToast({ message: "Failed to save notes.", type: "error" });
    } finally {
      setSavingNotesId(null);
    }
  }, [notesMap, savingNotesId]);

  const assignWeekly = useCallback(async () => {
    if (assigning) return;
    if (!selectedTemplateId) { setToast({ message: "Pick a template first.", type: "error" }); return; }
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
          <BackButton onClick={() => router.push("/admin")} />
        </div>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center shadow-card">
            <ClipboardList className="w-4.5 h-4.5 text-foreground" strokeWidth={2} />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-xl text-foreground leading-tight">Sessions</h2>
            <p className="text-xs text-muted-foreground">Build templates and assign this week's session</p>
          </div>
        </div>

        {/* ── Create template ── */}
        <div className="bg-card border border-border rounded-2xl shadow-card p-5">
          <p className="text-xs font-semibold text-muted-foreground mb-3">Create template</p>

          <label className="block text-xs font-semibold text-muted-foreground mb-2">Title</label>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="e.g. Lower Body Power"
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none mb-4"
            disabled={creating}
          />

          <BlockBuilder blocks={newBlocks} setBlocks={setNewBlocks} disabled={creating} />

          <div className="mt-5">
            <PrimaryButton type="button" onClick={() => void createTemplate()} disabled={creating} loading={creating}>
              <Save className="w-4 h-4" />
              Create template
            </PrimaryButton>
          </div>
        </div>

        {/* ── Templates list ── */}
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
                  // ── Inline edit ──
                  <div key={t.id} className="border border-border rounded-2xl p-4 bg-background">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <p className="text-xs font-semibold text-muted-foreground">Editing template</p>
                      <button type="button" onClick={cancelEdit} disabled={saving}
                        className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
                        <X className="w-3.5 h-3.5" /> Cancel
                      </button>
                    </div>

                    <label className="block text-xs font-semibold text-muted-foreground mb-2">Title</label>
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="e.g. Lower Body Power"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none mb-4"
                      disabled={saving}
                    />

                    <BlockBuilder blocks={editBlocks} setBlocks={setEditBlocks} disabled={saving} />

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
                        <p className="text-xs text-muted-foreground">
                          {exercisesToBlocks(t.exercises).length} block{exercisesToBlocks(t.exercises).length === 1 ? "" : "s"} · {t.exercises.length} exercise{t.exercises.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <button type="button" onClick={() => startEdit(t)} disabled={!!editTarget}
                          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button type="button" onClick={() => setDeleteTarget(t)}
                          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                    {/* Block preview */}
                    <div className="mt-3 space-y-2">
                      {exercisesToBlocks(t.exercises).map((block) => {
                        const col = BLOCK_COLORS[block.color] ?? BLOCK_COLORS.a;
                        const isConditioning = block.color === "conditioning";
                        const gtLabel = block.group_type === "superset" ? "Superset" : block.group_type === "triset" ? "Tri-set" : null;
                        const restMins = restSecondsToMins(block.rest_seconds);
                        return (
                          <div key={block._key} className={`rounded-xl border ${col.border} ${col.bg} px-3 py-2`}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                              <p className={`text-xs font-bold ${col.text}`}>{block.label}</p>
                              {gtLabel && <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md bg-black/10 ${col.text} ml-1`}>{gtLabel}</span>}
                              {restMins && (
                                <p className="text-xs text-muted-foreground ml-auto">Rest {restMins} mins</p>
                              )}
                            </div>
                            {block.exercises.map((ex, ei) => (
                              <p key={ex._key} className="text-xs text-muted-foreground pl-3.5">
                                {block.exercises.length > 1 ? `${ei + 1}. ` : ""}{ex.name}
                                {isConditioning
                                  ? (ex.cond_rounds ? ` — ${ex.cond_rounds}` : "") + (ex.cond_work ? ` ${ex.cond_work}` : "") + (ex.cond_distance ? ` ${ex.cond_distance}` : "")
                                  : (ex.target_sets || ex.target_reps) ? ` — ${ex.target_sets ?? "—"}×${ex.target_reps || "—"}` : ""}
                              </p>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>

        {/* ── This week's session ── */}
        <div className="mt-6 bg-card border border-border rounded-2xl shadow-card p-5">
          <p className="text-xs font-semibold text-muted-foreground mb-3">This week's session</p>

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
                      <button type="button" onClick={() => void removeAssignment(a.id)} disabled={removingId === a.id}
                        className="shrink-0 flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50">
                        <Trash2 className="w-3.5 h-3.5" />
                        {removingId === a.id ? "Removing…" : "Remove"}
                      </button>
                    </div>
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
                        <SecondaryButton type="button" onClick={() => void saveNotes(a.id)} disabled={savingNotesId === a.id}>
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
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting}
                className="flex-1 px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm font-semibold hover:bg-secondary transition-colors">
                Cancel
              </button>
              <button type="button" onClick={() => void deleteTemplate()} disabled={deleting}
                className="flex-1 px-4 py-3 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
