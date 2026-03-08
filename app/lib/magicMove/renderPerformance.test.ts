import { describe, expect, it } from "bun:test";

import { getPreviewPixelRatio } from "./renderPerformance";

describe("getPreviewPixelRatio", () => {
  it("caps non-background preview rendering at 2x", () => {
    expect(getPreviewPixelRatio(false, 3)).toBe(2);
  });

  it("caps background preview rendering at 1.5x", () => {
    expect(getPreviewPixelRatio(true, 3)).toBe(1.5);
  });

  it("falls back to 1x for invalid device pixel ratios", () => {
    expect(getPreviewPixelRatio(true, Number.NaN)).toBe(1);
  });
});
