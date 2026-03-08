import { describe, expect, it } from "bun:test";

import { buildFrameTimestamps } from "./recordCanvas";

describe("buildFrameTimestamps", () => {
  it("builds evenly spaced logical frame timestamps", () => {
    expect(buildFrameTimestamps(1000, 2)).toEqual([500, 1000]);
  });

  it("clamps the final timestamp to the requested duration", () => {
    expect(buildFrameTimestamps(1100, 2)).toEqual([500, 1000, 1100]);
  });

  it("returns an empty list for invalid durations or frame rates", () => {
    expect(buildFrameTimestamps(0, 60)).toEqual([]);
    expect(buildFrameTimestamps(1000, 0)).toEqual([]);
  });
});
