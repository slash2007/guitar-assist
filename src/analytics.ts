export function accuracyBand(correct: number, answered: number): string {
  if (answered <= 0) return "0";
  const ratio = correct / answered;
  if (ratio >= 0.9) return "90+";
  if (ratio >= 0.5) return "50-89";
  return "under-50";
}

type EventData = Record<string, string | number>;

type UmamiTracker = {
  track: (event: string, data?: EventData) => void;
};

function tracker(): UmamiTracker | null {
  const umami = (globalThis as typeof globalThis & { umami?: UmamiTracker }).umami;
  if (!umami || typeof umami.track !== "function") return null;
  return umami;
}

export function track(event: string, data?: EventData) {
  try {
    tracker()?.track(event, data);
  } catch {
    // A blocked or broken analytics script must not interrupt practice.
  }
}
