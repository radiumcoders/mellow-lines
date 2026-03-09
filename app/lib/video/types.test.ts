import { describe, expect, it } from "bun:test";

import { getEffectiveExportFps } from "./types";

describe("getEffectiveExportFps", () => {
  it("maps 60 fps GIF exports to 50 fps for playback consistency", () => {
    expect(getEffectiveExportFps("gif", 60)).toBe(50);
  });

  it("preserves 30 fps GIF exports", () => {
    expect(getEffectiveExportFps("gif", 30)).toBe(30);
  });

  it("preserves 60 fps MP4 exports", () => {
    expect(getEffectiveExportFps("mp4", 60)).toBe(60);
  });

  it("preserves 60 fps WebM exports", () => {
    expect(getEffectiveExportFps("webm", 60)).toBe(60);
  });
});
