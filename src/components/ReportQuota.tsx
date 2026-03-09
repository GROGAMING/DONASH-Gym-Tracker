"use client";

interface ReportQuotaProps {
  weekly: Array<{ name: string; count: number }>;
  overall: Array<{ name: string; count: number }>;
  users: Array<{ name: string }>;
  quota: number;
}

export default function ReportQuota({ weekly, users, quota }: ReportQuotaProps) {
  const weeklyMap = new Map(weekly.map((r) => [r.name, r.count]));
  const met = users.map((u) => u.name).filter((n) => (weeklyMap.get(n) ?? 0) >= quota);
  const notMet = users.map((u) => u.name).filter((n) => (weeklyMap.get(n) ?? 0) < quota);

  return (
    <div>
      <h3>Met this week&apos;s quota ({quota})</h3>
      <p>{met.length ? met.join(", ") : "None"}</p>

      <h3>Did not meet this week&apos;s quota ({quota})</h3>
      <p>{notMet.length ? notMet.join(", ") : "None"}</p>
    </div>
  );
}
