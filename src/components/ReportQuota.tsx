"use client";

import { getWeeklyRequiredSessions } from "@/lib/weeklyQuotaSimple";

interface ReportQuotaProps {
  weekly: Array<{ name: string; count: number }>;
  overall: Array<{ name: string; count: number }>;
  users: Array<{ name: string }>;
}

export default function ReportQuota({ weekly, overall, users }: ReportQuotaProps) {
  const required = getWeeklyRequiredSessions();
  
  const weeklyMap = new Map(weekly.map((r) => [r.name, r.count]));
  const met = users.map((u) => u.name).filter((n) => (weeklyMap.get(n) ?? 0) >= required);
  const notMet = users.map((u) => u.name).filter((n) => (weeklyMap.get(n) ?? 0) < required);
  
  return (
    <div>
      <h3>Met this week's quota ({required})</h3>
      <p>{met.length ? met.join(", ") : "None"}</p>
      
      <h3>Did not meet this week's quota ({required})</h3>
      <p>{notMet.length ? notMet.join(", ") : "None"}</p>
    </div>
  );
}
