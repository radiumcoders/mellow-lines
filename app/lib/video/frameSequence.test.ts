import { describe, expect, it } from "bun:test";

import { buildDeterministicFrameTimestamps, buildFrameFileName } from "./frameSequence";

describe("buildDeterministicFrameTimestamps", () => {
  it("includes the start and final exact timestamp", () => {
    expect(buildDeterministicFrameTimestamps(1000, 2)).toEqual([0, 500, 1000]);
  });

  it("appends the exact final timestamp for non-integral durations", () => {
    expect(buildDeterministicFrameTimestamps(1100, 2)).toEqual([0, 500, 1000, 1100]);
  });

  it("does not duplicate the final timestamp on exact frame boundaries", () => {
    expect(buildDeterministicFrameTimestamps(1500, 2)).toEqual([0, 500, 1000, 1500]);
  });

  it("returns an empty list for invalid durations or frame rates", () => {
    expect(buildDeterministicFrameTimestamps(0, 60)).toEqual([]);
    expect(buildDeterministicFrameTimestamps(1000, 0)).toEqual([]);
  });
});

describe("buildFrameFileName", () => {
  it("produces zero-padded sequential names", () => {
    expect(buildFrameFileName(0)).toBe("frame-000000.png");
    expect(buildFrameFileName(12)).toBe("frame-000012.png");
    expect(buildFrameFileName(123456)).toBe("frame-123456.png");
  });
});
