import type { GateBlocker, GateReport } from "../domain/gate";
import type { Locale } from "../domain/types";
import { t } from "../i18n/t";
import { formatMs, formatPct } from "./format";

export function blockerText(kind: GateBlocker, gate: GateReport, locale: Locale, stageName = ""): string {
  const ms = (value: number | null) => formatMs(value, locale);
  if (kind === "coverage-repeat") return t(locale, "blocker.coverageRepeat");
  if (kind === "coverage") {
    if (gate.coveredCards === 0) {
      return t(locale, "blocker.coverageZero", { name: stageName, b: gate.totalCards });
    }
    return t(locale, "blocker.coverage", { a: gate.coveredCards, b: gate.totalCards });
  }
  if (kind === "identify") {
    return t(locale, "blocker.identify", { ms: ms(gate.identifyGapMs), target: ms(gate.identifyTargetMs) });
  }
  if (kind === "locate") {
    return t(locale, "blocker.locate", { ms: ms(gate.locateGapMs), target: ms(gate.locateTargetMs) });
  }
  if (kind === "accuracy") return t(locale, "blocker.accuracy", { pct: formatPct(gate.accuracy) });
  if (kind === "volume") return t(locale, "blocker.volume");
  if (kind === "open") return t(locale, "blocker.open");
  return t(locale, "blocker.ready");
}

export function gateChecks(gate: GateReport, locale: Locale): Array<{ ok: boolean; text: string; hint?: string }> {
  const ms = (value: number | null) => formatMs(value, locale);
  return [
    {
      ok: gate.coverageOk,
      text: t(locale, "progress.checkCoverage", { a: gate.coveredCards, b: gate.totalCards }),
      hint: t(locale, "progress.checkCoverageHint"),
    },
    {
      ok: gate.identifyOk,
      text: t(locale, "progress.checkIdentify", { ms: ms(gate.identifyMedianMs), target: ms(gate.identifyTargetMs) }),
    },
    {
      ok: gate.locateOk,
      text: t(locale, "progress.checkLocate", { ms: ms(gate.locateMedianMs), target: ms(gate.locateTargetMs) }),
    },
    {
      ok: gate.accuracyOk,
      text: t(locale, "progress.checkAccuracy", { pct: formatPct(gate.accuracy) }),
    },
  ];
}
