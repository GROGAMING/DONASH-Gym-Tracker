export function mondayWeekStartISO(d: Date): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // Monday=0
  x.setDate(x.getDate() - day);
  return x.toISOString().slice(0, 10);
}

export function mondayFromAnyDateISO(dateISO: string): string {
  const d = new Date(dateISO + "T00:00:00");
  return mondayWeekStartISO(d);
}
