import { evaluateGate, latestStageRound } from "../../domain/gate";
import { buildHeatmap } from "../../domain/heatmap";
import { stageDef, unlockedStrings } from "../../domain/stages";
import { attemptDateKey, lastNDateKeys, localDateKey, median } from "../../domain/stats";
import { Fretboard } from "../fretboard/Fretboard";
import { formatMs } from "../format";
import { gateChecks } from "../gateCopy";
import { PageHeader } from "../PageHeader";
import { PathList } from "../PathBar";
import { useStore } from "../store";
import { useT } from "../useT";

export function ProgressPage() {
  const { profile, attempts, summaries } = useStore();
  const { t, locale } = useT();
  const unlocked = unlockedStrings(profile.stage);
  const focus = stageDef(profile.stage)?.strings ?? unlocked;
  const heat = buildHeatmap(unlocked, attempts);
  const stage = Math.max(1, profile.stage);
  const gate = evaluateGate(stage, attempts, profile.guitarInHand, latestStageRound(stage, summaries));
  const checks = gateChecks(gate, locale);
  const days = lastNDateKeys(7);
  const ms = (value: number | null) => formatMs(value, locale);

  return (
    <section className="page">
      <PageHeader eyebrow={t("progress.eyebrow")} title={t("progress.path")} />
      <PathList stage={profile.stage}>
        <ul className="check-list">
          {checks.map((item) => (
            <li key={item.text} className={item.ok ? "is-ok" : ""}>
              <span aria-hidden>{item.ok ? "✓" : "○"}</span>
              <div>
                <p>{item.text}</p>
                {item.hint ? <small>{item.hint}</small> : null}
              </div>
            </li>
          ))}
        </ul>
      </PathList>
      <section className="progress-panel" aria-labelledby="heat-title">
        <h2 id="heat-title">{t("progress.heatTitle")}</h2>
        <p className="lede">{t("progress.heatLede")}</p>
        <ul className="heat-legend" aria-label={t("progress.legendAria")}>
          <li>
            <i className="heat-swatch is-fast" aria-hidden />
            {t("progress.legendFast")}
          </li>
          <li>
            <i className="heat-swatch is-ok" aria-hidden />
            {t("progress.legendOk")}
          </li>
          <li>
            <i className="heat-swatch is-slow" aria-hidden />
            {t("progress.legendSlow")}
          </li>
          <li>
            <i className="heat-swatch is-fail" aria-hidden />
            {t("progress.legendFail")}
          </li>
        </ul>
        <Fretboard
          lefty={profile.lefty}
          locale={locale}
          showFretNumbers={profile.showFretNumbers}
          heat={heat}
          unlockedStrings={unlocked}
          activeStrings={focus}
        />
      </section>
      <h2>{t("progress.week")}</h2>
      <ol className="week">
        {days.map((day) => {
          const dayAttempts = attempts.filter((item) => attemptDateKey(item.at) === day);
          const done = dayAttempts.length > 0;
          const med = median(dayAttempts.filter((item) => item.correct).map((item) => item.latencyMs));
          return (
            <li key={day} className={done ? "is-done" : ""}>
              <span>{Number(day.slice(8))}</span>
              <small>{day === localDateKey() ? t("progress.todayShort") : done ? ms(med) : t("progress.empty")}</small>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
