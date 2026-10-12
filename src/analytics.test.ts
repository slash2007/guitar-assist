import { describe, expect, it } from "vitest";
import { accuracyBand } from "./analytics";

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
