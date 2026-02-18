"use client";

import { getWeeklyRequiredSessions } from "@/lib/weeklyQuotaSimple";

interface MetQuotaTickProps {
  weeklyCount: number;
}

export default function MetQuotaTick({ weeklyCount }: MetQuotaTickProps) {
  const required = getWeeklyRequiredSessions();
  const met = (weeklyCount ?? 0) >= required;
  
  if (!met) return null;
  
  return <span className="met-quota">✅</span>;
}
