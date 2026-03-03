import React, { useMemo, useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Check } from "lucide-react";

interface PlayerSelectProps {
  players: string[];
  selected: string | null;
  onSelect: (name: string) => void;
}

const PlayerSelect: React.FC<PlayerSelectProps> = ({ players, selected, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) => p.toLowerCase().includes(q));
  }, [players, search]);

  useEffect(() => {
    if (open && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (name: string) => {
    onSelect(name);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`
          w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 bg-card
          transition-all duration-200 active-scale
          ${open
            ? "border-primary shadow-card"
            : "border-border hover:border-muted-foreground/40 shadow-card"
          }
        `}
      >
        <span className={selected ? "text-foreground font-medium" : "text-muted-foreground"}>
          {selected || "Choose your name…"}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 top-full mt-2 border border-border rounded-xl shadow-card-hover overflow-hidden animate-scale-in bg-card text-foreground">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name…"
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>
          </div>
          {/* Options */}
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No players found
              </div>
            ) : (
              filtered.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleSelect(name)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-secondary transition-colors text-left"
                >
                  <span className={name === selected ? "font-semibold text-foreground" : "text-foreground"}>
                    {name}
                  </span>
                  {name === selected && (
                    <Check className="w-4 h-4 text-accent" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerSelect;
