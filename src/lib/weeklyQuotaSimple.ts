"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "weekly_required_sessions";

export function getWeeklyRequiredSessions(): number {
  if (typeof window === "undefined") return 3; // SSR guard
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const value = stored ? parseInt(stored, 10) : 3;
    return (value >= 1 && value <= 4) ? value : 3;
  } catch {
    return 3; // Fallback on error
  }
}

export function setWeeklyRequiredSessions(value: 1 | 2 | 3 | 4): void {
  if (typeof window === "undefined") return; // SSR guard
  
  try {
    localStorage.setItem(STORAGE_KEY, value.toString());
  } catch {
    // Silent fail - localStorage might be disabled
  }
}

export function useWeeklyRequiredSessions() {
  const [required, setRequired] = useState<number>(3);

  useEffect(() => {
    // Load from localStorage on mount
    setRequired(getWeeklyRequiredSessions());
  }, []);

  const updateRequired = (value: 1 | 2 | 3 | 4) => {
    setRequired(value);
    setWeeklyRequiredSessions(value);
  };

  return { required, setRequired: updateRequired };
}
