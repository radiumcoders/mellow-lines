import { describe, expect, it } from "bun:test";

import { createBackgroundLayerCacheKey } from "./backgroundThemes";

describe("createBackgroundLayerCacheKey", () => {
  it("returns the same key for identical inputs", () => {
    const first = createBackgroundLayerCacheKey({
      themeId: "charcoal",
      width: 1200,
      height: 800,
      cardX: 48,
      cardY: 48,
      cardWidth: 1104,
      cardHeight: 704,
      cornerRadius: 16,
    });

    const second = createBackgroundLayerCacheKey({
      themeId: "charcoal",
      width: 1200,
      height: 800,
      cardX: 48,
      cardY: 48,
      cardWidth: 1104,
      cardHeight: 704,
      cornerRadius: 16,
    });

    expect(first).toBe(second);
  });

  it("changes when the background padding changes", () => {
    const narrowPadding = createBackgroundLayerCacheKey({
      themeId: "charcoal",
      width: 1200,
      height: 800,
      cardX: 48,
      cardY: 48,
      cardWidth: 1104,
      cardHeight: 704,
      cornerRadius: 16,
    });

    const widePadding = createBackgroundLayerCacheKey({
      themeId: "charcoal",
      width: 1232,
      height: 832,
      cardX: 64,
      cardY: 64,
      cardWidth: 1104,
      cardHeight: 704,
      cornerRadius: 16,
    });

    expect(narrowPadding).not.toBe(widePadding);
  });
});
