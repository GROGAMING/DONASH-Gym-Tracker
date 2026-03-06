"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Plus, Search } from "lucide-react";

type Exercise = { id: string; name: string };

interface ExerciseComboboxProps {
  value: string;
  onChange: (name: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ExerciseCombobox({ value, onChange, disabled, placeholder = "Search exercises…" }: ExerciseComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/exercise-library?q=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const data = (await res.json()) as Exercise[];
      setOptions(Array.isArray(data) ? data : []);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => void search(query), 150);
    return () => clearTimeout(timer);
  }, [open, query, search]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleOpen = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [disabled]);

  const handleSelect = useCallback((name: string) => {
    onChange(name);
    setOpen(false);
    setQuery("");
  }, [onChange]);

  const handleAddNew = useCallback(async () => {
    const name = query.trim();
    if (!name || adding) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/exercise-library", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok || res.status === 200) {
        onChange(name);
        setOpen(false);
        setQuery("");
      }
    } catch {
      // fall through
    } finally {
      setAdding(false);
    }
  }, [adding, onChange, query]);

  const trimmedQuery = query.trim();
  const exactMatch = options.some((o) => o.name.toLowerCase() === trimmedQuery.toLowerCase());
  const showAddNew = trimmedQuery.length > 0 && !exactMatch;

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-border bg-background text-foreground outline-none disabled:opacity-50 disabled:pointer-events-none"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value || placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-card-hover overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search…"
              className="flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="max-h-52 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">Loading…</p>
            ) : options.length === 0 && !showAddNew ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                {trimmedQuery.length > 0 ? "No matches. Type to add new." : "No exercises yet. Start typing."}
              </p>
            ) : (
              options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelect(opt.name)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors text-left"
                >
                  <Check className={`w-4 h-4 shrink-0 ${value === opt.name ? "text-foreground" : "opacity-0"}`} />
                  {opt.name}
                </button>
              ))
            )}

            {showAddNew && (
              <button
                type="button"
                onClick={() => void handleAddNew()}
                disabled={adding}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary transition-colors text-left border-t border-border disabled:opacity-50"
              >
                <Plus className="w-4 h-4 shrink-0" />
                Add "{trimmedQuery}"
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
