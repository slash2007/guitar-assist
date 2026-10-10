import { noteLabel } from "../../domain/labels";
import { chromaticNameAt, pitchClassAt } from "../../domain/tuning";
import { FRETS, STRING_NUMS, type Fret, type Locale, type StringNum } from "../../domain/types";
import { t } from "../../i18n/t";
import type { HeatCell } from "../../domain/heatmap";

export interface Mark {
  string: StringNum;
  fret: Fret;
  tone: "target" | "selected" | "correct" | "missed" | "wrong" | "peek";
}

interface Props {
  lefty?: boolean;
  showNames?: boolean;
  showFretNumbers?: boolean;
  locale?: Locale;
  visibleStrings?: StringNum[] | "all";
  activeStrings?: StringNum[] | "all";
  unlockedStrings?: StringNum[] | "all";
  marks?: Mark[];
  heat?: HeatCell[];
  clickable?: boolean | StringNum[];
  cue?: { string: StringNum; text: string } | null;
  guideKey?: string;
  onPress?: (string: StringNum, fret: Fret) => void;
}

const TOP = 30;
const GAP = 36;
const NUT_W = 10;
const SCALE = 1280;
const PAD = 16;

function fromNut(fretWire: number): number {
  return SCALE * (1 - 2 ** (-fretWire / 12));
}

function boardLayout(lefty: boolean, stringCount: number) {
  const height = 40 + stringCount * GAP;
  const boardLen = fromNut(12);
  const nutLeft = 80;
  const width = nutLeft + NUT_W + boardLen + PAD;
  const open = lefty ? width - 52 : 52;
  const nut = lefty ? width - nutLeft - NUT_W : nutLeft;
  const nutInner = lefty ? nut : nut + NUT_W;

  function wireX(fretWire: number): number {
    const d = fromNut(fretWire);
    return lefty ? nutInner - d : nutInner + d;
  }

  function fretX(fret: Fret): number {
    if (fret === 0) return open;
    return (wireX(fret - 1) + wireX(fret)) / 2;
  }

  function hitWidth(fret: Fret): number {
    if (fret === 0) return 40;
    return Math.max(34, Math.abs(wireX(fret) - wireX(fret - 1)) - 6);
  }

  const boardX = lefty ? wireX(12) : nut;
  const boardW = NUT_W + boardLen;

  return { height, width, open, nut, nutInner, wireX, fretX, hitWidth, boardX, boardW };
}

function stringOpacity(
  string: StringNum,
  activeStrings: StringNum[] | "all",
  unlockedStrings?: StringNum[] | "all",
): number {
  const focused = activeStrings === "all" || activeStrings.includes(string);
  if (unlockedStrings === undefined) return focused ? 1 : 0.35;
  const unlocked = unlockedStrings === "all" || unlockedStrings.includes(string);
  if (focused) return 1;
  if (unlocked) return 0.32;
  return 0.18;
}

export function Fretboard({
  lefty = false,
  showNames = false,
  showFretNumbers = true,
  locale = "zh",
  visibleStrings = "all",
  activeStrings = "all",
  unlockedStrings,
  marks = [],
  heat,
  clickable = false,
  cue = null,
  guideKey,
  onPress,
}: Props) {
  const strings = visibleStrings === "all" ? [...STRING_NUMS] : visibleStrings;
  const layout = boardLayout(lefty, strings.length);
  const { height, width, open, nut, wireX, fretX, hitWidth, boardX, boardW } = layout;
  const boardTop = 12;
  const boardBottom = height - 16;
  const cueIndex = cue ? strings.indexOf(cue.string) : -1;
  const cuePad = cueIndex >= 0 ? 20 : 0;
  const cueLayout =
    cue && cueIndex >= 0
      ? {
          x: lefty ? width - 16 : 16,
          y: TOP + cueIndex * GAP - 26,
          w: Math.max(52, 20 + cue.text.length * 11),
        }
      : null;

  return (
    <svg
      className="fretboard"
      viewBox={`0 ${-cuePad} ${width} ${height + cuePad}`}
      role="img"
      aria-label={t(locale, "fretboard.aria")}
    >
      <rect className="fretboard-head" x={lefty ? nut + NUT_W : 8} y={boardTop} width={lefty ? width - nut - NUT_W - 6 : nut - 8} height={boardBottom - boardTop} rx="8" />
      <rect className="fretboard-body" x={boardX} y={boardTop} width={boardW} height={boardBottom - boardTop} rx="3" />
      <rect className="fretboard-nut" x={nut} y={boardTop} width={NUT_W} height={boardBottom - boardTop} />

      {[3, 5, 7, 9, 12].map((fret) => {
        const x = fretX(fret as Fret);
        if (fret === 12) {
          return (
            <g key={fret}>
              <circle className="fretboard-inlay" cx={x} cy={TOP + GAP * 1.5} r="5.2" />
              <circle className="fretboard-inlay" cx={x} cy={TOP + GAP * 3.5} r="5.2" />
            </g>
          );
        }
        return <circle key={fret} className="fretboard-inlay" cx={x} cy={TOP + GAP * 2.5} r="5.2" />;
      })}

      {Array.from({ length: 12 }, (_, i) => i + 1).map((fret) => (
        <line
          key={`wire-${fret}`}
          className="fretboard-wire"
          x1={wireX(fret)}
          x2={wireX(fret)}
          y1={boardTop + 2}
          y2={boardBottom - 2}
        />
      ))}

      {strings.map((string, index) => {
        const y = TOP + index * GAP;
        const opacity = stringOpacity(string, activeStrings, unlockedStrings);
        const canClick = clickable === true || (Array.isArray(clickable) && clickable.includes(string));
        return (
          <g key={`cells-${string}`} opacity={opacity}>
            {FRETS.map((fret) => {
              const x = fretX(fret);
              const natural = pitchClassAt(string, fret);
              const mark = marks.find((item) => item.string === string && item.fret === fret);
              const cellHeat = heat?.find((item) => item.string === string && item.fret === fret)?.heat;
              const notableHeat =
                cellHeat === "fast" || cellHeat === "ok" || cellHeat === "slow" || cellHeat === "fail";
              const showDot = Boolean((!mark && notableHeat) || (showNames && natural && !mark));
              const w = hitWidth(fret);
              return (
                <g key={`${string}-${fret}`}>
                  {canClick ? (
                    <rect
                      className="fretboard-hit"
                      x={x - w / 2}
                      y={y - 16}
                      width={w}
                      height={32}
                      rx="10"
                      onClick={() => onPress?.(string, fret)}
                    />
                  ) : null}
                  {showDot ? (
                    <circle
                      className={[
                        "fretboard-dot",
                        mark ? `is-${mark.tone}` : "",
                        cellHeat ? `heat-${cellHeat}` : "",
                        showNames && natural ? "is-named" : "",
                      ].join(" ")}
                      cx={x}
                      cy={y}
                      r="11"
                    />
                  ) : null}
                </g>
              );
            })}
          </g>
        );
      })}

      {strings.map((string, index) => {
        const y = TOP + index * GAP;
        const opacity = stringOpacity(string, activeStrings, unlockedStrings);
        const end = lefty ? 10 : width - 10;
        return (
          <line
            key={`string-${string}`}
            className={`fretboard-string ${opacity >= 0.9 ? "is-active" : "is-dim"}`}
            opacity={opacity}
            x1={lefty ? end : open - 18}
            x2={lefty ? open + 18 : end}
            y1={y}
            y2={y}
            strokeWidth={1.15 + string * 0.38}
            pointerEvents="none"
          />
        );
      })}

      {marks.map((mark) => {
        const index = strings.indexOf(mark.string);
        if (index < 0) return null;
        const x = fretX(mark.fret);
        const y = TOP + index * GAP;
        const opacity = stringOpacity(mark.string, activeStrings, unlockedStrings);
        if (mark.tone === "target") {
          return (
            <g
              key={`mark-${mark.tone}-${mark.string}-${mark.fret}-${guideKey ?? ""}`}
              className="fretboard-target"
              pointerEvents="none"
              opacity={opacity}
              transform={`translate(${x} ${y})`}
            >
              <circle className="fretboard-target-funnel" r="46" />
              <circle className="fretboard-dot is-target" r="9" />
            </g>
          );
        }
        if (mark.tone === "missed") {
          return (
            <g
              key={`mark-${mark.tone}-${mark.string}-${mark.fret}`}
              pointerEvents="none"
              opacity={opacity}
            >
              <circle className="fretboard-missed-ring" cx={x} cy={y} r="17" />
              <circle className="fretboard-dot is-missed" cx={x} cy={y} r="12" />
            </g>
          );
        }
        if (mark.tone === "wrong") {
          return (
            <g
              key={`mark-${mark.tone}-${mark.string}-${mark.fret}`}
              pointerEvents="none"
              opacity={opacity}
            >
              <circle className="fretboard-dot is-wrong" cx={x} cy={y} r="12" />
              <path
                className="fretboard-wrong-x"
                d={`M ${x - 5} ${y - 5} L ${x + 5} ${y + 5} M ${x + 5} ${y - 5} L ${x - 5} ${y + 5}`}
              />
            </g>
          );
        }
        return (
          <circle
            key={`mark-${mark.tone}-${mark.string}-${mark.fret}`}
            className={`fretboard-dot is-${mark.tone}`}
            cx={x}
            cy={y}
            r="12"
            opacity={opacity}
            pointerEvents="none"
          />
        );
      })}

      {cue && cueLayout ? (
        <g
          key={`cue-${cue.string}-${guideKey ?? cue.text}`}
          transform={`translate(${cueLayout.x} ${cueLayout.y})`}
          pointerEvents="none"
        >
          <g className="fretboard-cue">
            <rect className="fretboard-cue-bg" x={-cueLayout.w / 2} y={-15} width={cueLayout.w} height={30} rx="9" />
            <text className="fretboard-cue-text" y="5">
              {cue.text}
            </text>
          </g>
        </g>
      ) : null}

      {strings.map((string, index) => {
        const y = TOP + index * GAP;
        const opacity = stringOpacity(string, activeStrings, unlockedStrings);
        const labelX = lefty ? width - 16 : 16;
        return (
          <g key={`labels-${string}`} opacity={opacity} pointerEvents="none">
            <text className="fretboard-string-label" x={labelX} y={y + 4}>
              {string}
            </text>
            {FRETS.map((fret) => {
              const x = fretX(fret);
              const natural = pitchClassAt(string, fret);
              const pitch = chromaticNameAt(string, fret);
              const mark = marks.find((item) => item.string === string && item.fret === fret);
              const revealMark =
                mark && (mark.tone === "correct" || mark.tone === "missed" || mark.tone === "peek");
              const label =
                showNames && natural
                  ? noteLabel(natural)
                  : revealMark
                    ? noteLabel(pitch)
                    : "";
              return label ? (
                <text key={`${string}-${fret}`} className="fretboard-note" x={x} y={y + 4}>
                  {label}
                </text>
              ) : null;
            })}
          </g>
        );
      })}

      <text className="fretboard-fret-num" x={open} y={height - 2}>
        {t(locale, "fret.open")}
      </text>
      {showFretNumbers
        ? Array.from({ length: 12 }, (_, i) => (i + 1) as Fret).map((fret) => (
            <text key={`n-${fret}`} className="fretboard-fret-num" x={fretX(fret)} y={height - 2}>
              {fret}
            </text>
          ))
        : null}
    </svg>
  );
}
