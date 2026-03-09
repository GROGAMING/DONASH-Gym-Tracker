"use client";

interface MetQuotaTickProps {
  weeklyCount: number;
  quota: number;
}

export default function MetQuotaTick({ weeklyCount, quota }: MetQuotaTickProps) {
  const met = (weeklyCount ?? 0) >= quota;
  if (!met) return null;
  return <span className="met-quota">✅</span>;
}
