import { describe, expect, it } from "vitest";
import { accuracyBand, track } from "./analytics";

describe("accuracyBand", () => {
  it("buckets a finished round without sending the exact percentage", () => {
    expect(accuracyBand(0, 0)).toBe("0");
    expect(accuracyBand(4, 10)).toBe("under-50");
    expect(accuracyBand(5, 10)).toBe("50-89");
    expect(accuracyBand(8, 9)).toBe("50-89");
    expect(accuracyBand(9, 10)).toBe("90+");
    expect(accuracyBand(10, 10)).toBe("90+");
  });
});

describe("track", () => {
  it("sends each event without waiting for the previous request", () => {
    const calls: string[] = [];
    const root = globalThis as typeof globalThis & {
      umami?: { track: (event: string) => Promise<void> };
    };
    const previous = root.umami;
    root.umami = {
      track(event: string) {
        calls.push(event);
        return new Promise(() => undefined);
      },
    };
    try {
      track("tab", { name: "practice" });
      track("practice_start", { stage: 1 });
      expect(calls).toEqual(["tab", "practice_start"]);
    } finally {
      root.umami = previous;
    }
  });
});
