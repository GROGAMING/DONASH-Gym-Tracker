export function mondayWeekStartISO(d: Date): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // Monday=0
  x.setDate(x.getDate() - day);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function mondayFromAnyDateISO(dateISO: string): string {
  const d = new Date(dateISO + "T00:00:00");
  return mondayWeekStartISO(d);
}
