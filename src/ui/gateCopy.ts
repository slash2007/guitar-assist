import type { GateBlocker, GateReport } from "../domain/gate";
import type { Locale } from "../domain/types";
import { t } from "../i18n/t";
import { formatMs, formatPct } from "./format";

export function blockerText(kind: GateBlocker, gate: GateReport, locale: Locale, stageName = ""): string {
  const ms = (value: number | null) => formatMs(value, locale);
  if (kind === "coverage") {
    if (gate.seenCards === 0) {
      return t(locale, "blocker.coverageZero", { name: stageName, b: gate.totalCards });
    }
    return t(locale, "blocker.coverage", { a: gate.seenCards, b: gate.totalCards });
  }
  if (kind === "round") return t(locale, "blocker.round");
  if (kind === "identify") {
    if (gate.identifyCorrect === 0) return t(locale, "blocker.identifyNone");
    return t(locale, "blocker.identify", {
      ms: ms(gate.slowestIdentifyMs),
      target: ms(gate.identifyTargetMs),
    });
  }
  if (kind === "locate") {
    if (gate.locateCorrect === 0) return t(locale, "blocker.locateNone");
    return t(locale, "blocker.locate", {
      ms: ms(gate.slowestLocateMs),
      target: ms(gate.locateTargetMs),
    });
  }
  if (kind === "accuracy") return t(locale, "blocker.accuracy", { pct: formatPct(gate.accuracy) });
  if (kind === "open") return t(locale, "blocker.open");
  return t(locale, "blocker.ready");
}

export function gateChecks(gate: GateReport, locale: Locale): Array<{ ok: boolean; text: string; hint?: string }> {
  const ms = (value: number | null) => formatMs(value, locale);
  const checks: Array<{ ok: boolean; text: string; hint?: string }> = [];
  if (gate.needsSeen) {
    checks.push({
      ok: gate.coverageOk,
      text: t(locale, "progress.checkCoverage", { a: gate.seenCards, b: gate.totalCards }),
      hint: t(locale, "progress.checkCoverageHint"),
    });
  }
  if (!gate.hasRound || gate.identifyAsked) {
    checks.push({
      ok: gate.identifyOk && gate.accuracyOk,
      text: speedLine(locale, "identify", gate, ms(gate.identifyTargetMs), ms(gate.slowestIdentifyMs)),
    });
  }
  if (!gate.hasRound || gate.locateAsked) {
    checks.push({
      ok: gate.locateOk && gate.accuracyOk,
      text: speedLine(locale, "locate", gate, ms(gate.locateTargetMs), ms(gate.slowestLocateMs)),
    });
  }
  checks.push({
    ok: gate.accuracyOk,
    text: t(locale, "progress.checkAccuracy", { pct: formatPct(gate.accuracy) }),
  });
  return checks;
}

function speedLine(
  locale: Locale,
  kind: "identify" | "locate",
  gate: GateReport,
  target: string,
  slowest: string,
): string {
  const correct = kind === "identify" ? gate.identifyCorrect : gate.locateCorrect;
  const within = kind === "identify" ? gate.identifyOk : gate.locateOk;
  const noneKey = kind === "identify" ? "progress.checkIdentifyNone" : "progress.checkLocateNone";
  const slowKey = kind === "identify" ? "progress.checkIdentifySlow" : "progress.checkLocateSlow";
  const countKey = kind === "identify" ? "progress.checkIdentifyCount" : "progress.checkLocateCount";
  const okKey = kind === "identify" ? "progress.checkIdentify" : "progress.checkLocate";
  if (!gate.hasRound || correct === 0) return t(locale, noneKey, { target });
  if (!within) return t(locale, slowKey, { target, ms: slowest });
  if (!gate.accuracyOk) return t(locale, countKey, { n: correct, target });
  return t(locale, okKey, { target });
}
