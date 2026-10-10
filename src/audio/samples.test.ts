import { describe, expect, it } from "vitest";
import { FRETS, STRING_NUMS } from "../domain/types";
import { midiAt } from "../domain/tuning";
import { fretboardSamples, midiFromToken, parseSampleFile, SAMPLE_FILES, sampleFor, sampleUrl } from "./samples";

describe("samples", () => {
  it("reads Dx as a sharp and maps scientific pitch to MIDI", () => {
    expect(midiFromToken("E2")).toBe(40);
    expect(midiFromToken("Dx2")).toBe(39);
    expect(midiFromToken("A4")).toBe(69);
    expect(midiFromToken("Cx5")).toBe(73);
  });

  it("parses the library filenames", () => {
    expect(parseSampleFile("string-6-E-as-E2.wav")).toEqual({
      file: "string-6-E-as-E2.wav",
      string: 6,
      midi: 40,
    });
    expect(parseSampleFile("string-1-Ax-as-Ax4.wav")).toEqual({
      file: "string-1-Ax-as-Ax4.wav",
      string: 1,
      midi: 70,
    });
  });

  it("prefers the recorded string, then reuses a thinner string of the same pitch", () => {
    expect(sampleFor(6, 0)?.file).toBe("string-6-E-as-E2.wav");
    expect(sampleFor(6, 5)?.file).toBe("string-5-A-as-A2.wav");
    expect(sampleFor(6, 12)?.file).toBe("string-4-E-as-E3.wav");
    expect(sampleFor(2, 5)?.file).toBe("string-1-E-as-E4.wav");
    expect(sampleFor(1, 0)?.file).toBe("string-1-E-as-E4.wav");
    expect(sampleFor(1, 12)?.file).toBe("string-1-E-as-E5.wav");
  });

  it("covers every 6 × 0–12 fret with a sample", () => {
    for (const string of STRING_NUMS) {
      for (const fret of FRETS) {
        const sample = sampleFor(string, fret);
        expect(sample, `${string}:${fret}`).toBeTruthy();
        expect(sample!.midi).toBe(midiAt(string, fret));
      }
    }
    expect(fretboardSamples()).toHaveLength(37);
    expect(SAMPLE_FILES).toHaveLength(48);
  });

  it("builds public urls under the app base", () => {
    expect(sampleUrl("string-6-E-as-E2.wav")).toBe("/audio/guitar/stratocaster/string-6-E-as-E2.wav");
    expect(sampleUrl("string-6-E-as-E2.wav", "/app/")).toBe("/app/audio/guitar/stratocaster/string-6-E-as-E2.wav");
  });
});
