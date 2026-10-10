import { identifyId, locateId } from "./cards";
import { locateFindOne } from "./stages";
import { fretsForPitch, pitchClassAt } from "./tuning";
import {
  CHROMATIC_PITCHES,
  type CardId,
  type Fret,
  type IdentifyQuestion,
  type LocateQuestion,
  type PitchClass,
  type Question,
  type StringNum,
} from "./types";

export function buildIdentifyQuestion(string: StringNum, fret: Fret): IdentifyQuestion {
  const answer = pitchClassAt(string, fret);
  if (!answer) {
    throw new Error(`Cannot identify accidental at string ${string} fret ${fret}`);
  }
  return {
    kind: "identify",
    cardId: identifyId(string, fret),
    string,
    fret,
    answer,
    options: [...CHROMATIC_PITCHES],
  };
}

export function buildLocateQuestion(
  string: StringNum,
  pitch: PitchClass,
  stage: number,
): LocateQuestion {
  const answers = fretsForPitch(string, pitch);
  if (answers.length === 0) {
    throw new Error(`Pitch ${pitch} does not appear on string ${string} within 12 frets`);
  }
  return {
    kind: "locate",
    cardId: locateId(string, pitch),
    string,
    pitch,
    answers,
    findOne: locateFindOne(stage),
  };
}

export function questionFromCard(cardId: CardId, stage: number): Question {
  const [kind, stringRaw, rest] = cardId.split(":");
  const string = Number(stringRaw) as StringNum;
  if (kind === "id") {
    return buildIdentifyQuestion(string, Number(rest) as Fret);
  }
  return buildLocateQuestion(string, rest as PitchClass, stage);
}
