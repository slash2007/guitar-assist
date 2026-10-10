import type { ReactNode } from "react";
import { pathShort, stageLabel } from "../domain/labels";
import { STAGE_DEFS } from "../domain/stages";
import { useT } from "./useT";

type PathStatus = "done" | "now" | "locked";

function statusOf(stage: number, current: number): PathStatus {
  if (stage < current) return "done";
  if (stage === current) return "now";
  return "locked";
}

export function PathBar({ stage }: { stage: number }) {
  const { t, locale } = useT();
  return (
    <ol className="path-bar" aria-label={t("path.aria")}>
      {STAGE_DEFS.map((def) => {
        const status = statusOf(def.stage, stage);
        return (
          <li key={def.stage} className={`is-${status}`}>
            <span>{pathShort(def.stage, locale)}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function PathList({
  stage,
  children,
}: {
  stage: number;
  children?: ReactNode;
}) {
  const { t, locale } = useT();
  return (
    <ol className="path-list" aria-label={t("path.aria")}>
      {STAGE_DEFS.map((def) => {
        const status = statusOf(def.stage, stage);
        const statusKey =
          status === "done" ? "progress.statusDone" : status === "now" ? "progress.statusNow" : "progress.statusLocked";
        return (
          <li key={def.stage} className={`is-${status}`}>
            <div className="path-row">
              <b>{pathShort(def.stage, locale)}</b>
              <span>{stageLabel(def.stage, locale)}</span>
              <small>{t(statusKey)}</small>
            </div>
            {status === "now" ? children : null}
          </li>
        );
      })}
    </ol>
  );
}
