import { stageLabel } from "../../domain/labels";
import { PathBar } from "../PathBar";
import { useStore } from "../store";
import { useT } from "../useT";

export function AdvancePage() {
  const { profile, advanceTo, dismissAdvance, startPractice } = useStore();
  const { t, locale } = useT();
  if (advanceTo === null) return null;
  const nextLabel = stageLabel(advanceTo, locale);

  return (
    <section className="page advance">
      <p className="eyebrow">{t("today.eyebrow")}</p>
      <h1>{t("advance.title", { stage: stageLabel(advanceTo, locale) })}</h1>
      <PathBar stage={profile.stage} />
      <p className="lede">{t("advance.lede", { next: nextLabel })}</p>
      <div className="btn-row">
        <button
          type="button"
          className="primary-btn"
          onClick={() => {
            dismissAdvance();
            void startPractice();
          }}
        >
          {t("advance.continue")}
        </button>
        <button type="button" className="ghost-btn" onClick={() => dismissAdvance()}>
          {t("advance.later")}
        </button>
      </div>
    </section>
  );
}
