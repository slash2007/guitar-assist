import { useState } from "react";
import { playPitch } from "../../audio/play";
import { noteLabel, stringFullLabel } from "../../domain/labels";
import { chromaticNameAt, positionsForChromatic } from "../../domain/tuning";
import type { Fret, StringNum } from "../../domain/types";
import { Fretboard, type Mark } from "../fretboard/Fretboard";
import { PageHeader } from "../PageHeader";
import { useStore } from "../store";
import { useT } from "../useT";

export function ExplorePage() {
  const { profile } = useStore();
  const { t, locale } = useT();
  const [showNames, setShowNames] = useState(false);
  const [sameNotes, setSameNotes] = useState(false);
  const [picked, setPicked] = useState<{ string: StringNum; fret: Fret } | null>(null);

  const marks: Mark[] = [];
  if (picked) {
    const pitch = chromaticNameAt(picked.string, picked.fret);
    const spots = sameNotes ? positionsForChromatic(pitch) : [picked];
    for (const spot of spots) marks.push({ ...spot, tone: "peek" });
    if (sameNotes) marks.push({ ...picked, tone: "target" });
  }

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
          <input type="checkbox" checked={sameNotes} onChange={(e) => setSameNotes(e.target.checked)} />
          {t("explore.sameNotes")}
        </label>
      </div>
      <Fretboard
        lefty={profile.lefty}
        showNames={showNames}
        showFretNumbers={profile.showFretNumbers}
        locale={locale}
        marks={marks}
        clickable
        onPress={(string, fret) => {
          setPicked({ string, fret });
          void playPitch(string, fret);
        }}
      />
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
