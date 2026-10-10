import { useState } from "react";
import { playPitch } from "../../audio/play";
import { noteLabel, stringFullLabel } from "../../domain/labels";
import { unlockedStrings } from "../../domain/stages";
import { chromaticNameAt } from "../../domain/tuning";
import type { Fret, StringNum } from "../../domain/types";
import { Fretboard } from "../fretboard/Fretboard";
import { PageHeader } from "../PageHeader";
import { useStore } from "../store";
import { useT } from "../useT";

export function ExplorePage() {
  const { profile } = useStore();
  const { t, locale } = useT();
  const unlocked = unlockedStrings(profile.stage);
  const [showNames, setShowNames] = useState(false);
  const [onlyUnlocked, setOnlyUnlocked] = useState(false);
  const [picked, setPicked] = useState<{ string: StringNum; fret: Fret } | null>(null);
  const [lockedHint, setLockedHint] = useState(false);

  const visible = onlyUnlocked && unlocked.length > 0 ? unlocked : "all";

  return (
    <section className="page">
      <PageHeader eyebrow={t("explore.eyebrow")} title={t("explore.title")} />
      <p className="lede">{t("explore.lede")}</p>
      <div className="toggles">
        <label>
          <input type="checkbox" checked={showNames} onChange={(e) => setShowNames(e.target.checked)} />
          {t("explore.showNames")}
        </label>
        <label>
          <input
            type="checkbox"
            checked={onlyUnlocked}
            onChange={(e) => setOnlyUnlocked(e.target.checked)}
            disabled={unlocked.length === 0}
          />
          {t("explore.unlockedOnly")}
        </label>
      </div>
      <Fretboard
        lefty={profile.lefty}
        showNames={showNames}
        showFretNumbers={profile.showFretNumbers}
        locale={locale}
        visibleStrings={visible}
        unlockedStrings={unlocked}
        activeStrings={unlocked}
        marks={picked ? [{ string: picked.string, fret: picked.fret, tone: "peek" }] : []}
        clickable
        onPress={(string, fret) => {
          const locked = unlocked.length > 0 && !unlocked.includes(string);
          setLockedHint(locked);
          setPicked({ string, fret });
          void playPitch(string, fret);
        }}
      />
      {lockedHint ? <p className="hint">{t("explore.locked")}</p> : null}
      {picked ? (
        <p className="lede">
          {t("explore.picked", {
            string: stringFullLabel(picked.string, locale),
            fret: picked.fret,
            note: noteLabel(chromaticNameAt(picked.string, picked.fret)),
          })}
        </p>
      ) : null}
    </section>
  );
}
