import type { Locale } from "../domain/types";
import { t } from "../i18n/t";

export function formatMs(ms: number | null, locale: Locale = "en"): string {
  if (ms === null) return "—";
  return t(locale, "unit.sec", { n: (ms / 1000).toFixed(1) });
}

export function formatPct(value: number | null): string {
  if (value === null) return "—";
  return `${Math.round(value * 100)}%`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
