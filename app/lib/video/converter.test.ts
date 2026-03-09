import { describe, expect, it } from "bun:test";

import { buildGifEncodingArgs } from "./converter";

describe("buildGifEncodingArgs", () => {
  it("uses the requested input frame rate", () => {
    const args = buildGifEncodingArgs({ fps: 50 });
    expect(args.slice(0, 2)).toEqual(["-framerate", "50"]);
  });

  it("uses palette generation and palette application for GIF quality", () => {
    const args = buildGifEncodingArgs({ fps: 50 });
    const filterArg = args[args.indexOf("-vf") + 1];
    expect(filterArg.includes("palettegen")).toBe(true);
    expect(filterArg.includes("paletteuse")).toBe(true);
  });

  it("exports looping GIFs", () => {
    const args = buildGifEncodingArgs({ fps: 50 });
    const loopIndex = args.indexOf("-loop");
    expect(args[loopIndex + 1]).toBe("0");
  });
});
