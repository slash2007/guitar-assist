import { noteLabel } from "../../domain/labels";
import { chromaticNameAt, pitchClassAt } from "../../domain/tuning";
import { FRETS, STRING_NUMS, type Fret, type Locale, type StringNum } from "../../domain/types";
import { t } from "../../i18n/t";
import type { HeatCell } from "../../domain/heatmap";

export interface Mark {
  string: StringNum;
  fret: Fret;
  tone: "target" | "selected" | "correct" | "missed" | "wrong" | "peek";
  id?: string;
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
  cue?: { string?: StringNum; text: string } | null;
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

function isWoundString(string: StringNum): boolean {
  return string >= 4;
}

function stringStroke(string: StringNum): number {
  return 1.15 + string * 0.38;
}

function woundWrapPath(x1: number, x2: number, y: number, string: StringNum): string {
  const left = Math.min(x1, x2);
  const right = Math.max(x1, x2);
  const amp = 1.15 + (string - 4) * 0.28;
  const step = 2.9 + (string - 4) * 0.35;
  const lean = 1.7 + (string - 4) * 0.2;
  const parts: string[] = [];
  for (let x = left; x <= right; x += step) {
    parts.push(`M ${x.toFixed(1)} ${(y - amp).toFixed(1)} L ${(x + lean).toFixed(1)} ${(y + amp).toFixed(1)}`);
  }
  return parts.join(" ");
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
  locale = "en",
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
  const cueIndex = cue?.string != null ? strings.indexOf(cue.string) : -1;
  const cueOnString = cueIndex >= 0;
  const cueW = cue ? Math.max(52, 20 + [...cue.text].length * 12) : 0;
  const cuePad = cueW ? (cueOnString ? 20 : 28) : 0;
  const cueSidePad = cueW ? Math.max(0, Math.ceil(cueW * 0.6) - 8) : 0;
  const viewX = lefty ? 0 : -cueSidePad;
  const viewW = width + cueSidePad;
  const cueLayout = cue
    ? {
        x: lefty ? width - 16 : 16,
        y: cueOnString ? TOP + cueIndex * GAP - 26 : -8,
        w: cueW,
      }
    : null;

  return (
    <svg
      className="fretboard"
      viewBox={`${viewX} ${-cuePad} ${viewW} ${height + cuePad}`}
      preserveAspectRatio="xMidYMid meet"
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
        const end = lefty ? 10 : width - 10;
        const x1 = lefty ? end : open - 18;
        const x2 = lefty ? open + 18 : end;
        const wound = isWoundString(string);
        return (
          <g key={`string-${string}`} opacity={opacity} pointerEvents="none">
            <line
              className={`fretboard-string${opacity >= 0.9 ? " is-active" : " is-dim"}`}
              x1={x1}
              x2={x2}
              y1={y}
              y2={y}
              strokeWidth={stringStroke(string)}
            />
            {wound ? (
              <path
                className="fretboard-string-wrap"
                d={woundWrapPath(x1, x2, y, string)}
                strokeWidth={1.15 + (string - 4) * 0.15}
              />
            ) : null}
          </g>
        );
      })}

      {strings.map((string, index) => {
        const y = TOP + index * GAP;
        const opacity = stringOpacity(string, activeStrings, unlockedStrings);
        return (
          <g key={`heat-${string}`} opacity={opacity} pointerEvents="none">
            {FRETS.map((fret) => {
              const x = fretX(fret);
              const mark = marks.find((item) => item.string === string && item.fret === fret);
              const cellHeat = heat?.find((item) => item.string === string && item.fret === fret)?.heat;
              const notableHeat =
                cellHeat === "fast" || cellHeat === "ok" || cellHeat === "slow" || cellHeat === "fail";
              if (mark || !notableHeat) return null;
              return (
                <circle
                  key={`${string}-${fret}`}
                  className={`fretboard-dot heat-${cellHeat}`}
                  cx={x}
                  cy={y}
                  r="11"
                />
              );
            })}
          </g>
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
              key={`mark-${mark.tone}-${mark.string}-${mark.fret}-${mark.id ?? ""}`}
              className="fretboard-wrong-mark"
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
          key={`cue-${cue.string ?? "board"}-${guideKey ?? cue.text}`}
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
              const named = showNames && Boolean(natural) && !mark;
              const label = named ? noteLabel(natural!) : revealMark ? noteLabel(pitch) : "";
              if (!label) return null;
              return (
                <text
                  key={`${string}-${fret}`}
                  className={`fretboard-note${named ? " is-atlas" : ""}`}
                  x={x}
                  y={y + 4}
                >
                  {label}
                </text>
              );
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

      {strings.map((string, index) => {
        const y = TOP + index * GAP;
        const canClick = clickable === true || (Array.isArray(clickable) && clickable.includes(string));
        if (!canClick) return null;
        return (
          <g key={`hits-${string}`}>
            {FRETS.map((fret) => {
              const x = fretX(fret);
              const w = hitWidth(fret);
              return (
                <rect
                  key={`${string}-${fret}`}
                  className="fretboard-hit"
                  x={x - w / 2}
                  y={y - 16}
                  width={w}
                  height={32}
                  rx="10"
                  onClick={() => onPress?.(string, fret)}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
