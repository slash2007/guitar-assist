/** Same 0.1s bucket the UI shows, so 2049ms and 2.0s are the same number. */
export function tenthsSec(ms: number): number {
  return Math.round(ms / 100) / 10;
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

export function accuracy(correctFlags: readonly boolean[]): number | null {
  if (correctFlags.length === 0) return null;
  return correctFlags.filter(Boolean).length / correctFlags.length;
}

export function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(dateKey: string, delta: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y!, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + delta);
  return localDateKey(date);
}

export function lastNDateKeys(n: number, today = localDateKey()): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - (n - 1)));
}

export function attemptDateKey(iso: string): string {
  return localDateKey(new Date(iso));
}
