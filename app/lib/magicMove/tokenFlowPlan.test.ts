import { describe, expect, it } from "bun:test";

import { getTokenFlowStyle } from "./tokenFlowPresets";
import { buildTokenFlowTransitionPlan, diffLineBlocks, type TokenFlowStep } from "./tokenFlowPlan";
import type { LayoutResult } from "./codeLayout";
import type { TokenLine } from "./shikiHighlighter";

function makeStep(lines: Array<Array<{ content: string; color?: string }>>): TokenFlowStep {
  const tokenLines: TokenLine[] = lines.map((line) => ({
    tokens: line.map((token) => ({
      content: token.content,
      color: token.color ?? "#94a3b8",
    })),
  }));

  const layoutTokens: LayoutResult["tokens"] = [];
  let globalIndex = 0;

  tokenLines.forEach((line, lineIndex) => {
    let x = 24;
    for (const token of line.tokens) {
      const content = token.content.replace(/\t/g, "  ");
      layoutTokens.push({
        key: `${content}#${globalIndex++}`,
        content,
        color: token.color,
        x,
        y: 18 + lineIndex * 24,
        w: Math.max(8, content.length * 8),
        h: 20,
      });
      x += Math.max(8, content.length * 8);
    }
  });

  return {
    code: tokenLines.map((line) => line.tokens.map((token) => token.content).join("")).join("\n"),
    tokenLines,
    layout: {
      tokens: layoutTokens,
      bg: "#0f172a",
      fg: "#e2e8f0",
      gutter: {
        enabled: false,
        width: 0,
        color: "transparent",
        dividerColor: "transparent",
        textColor: "#64748b",
      },
      tokenLineCount: tokenLines.length,
    },
  };
}

describe("diffLineBlocks", () => {
  it("marks localized edits as changed blocks surrounded by equals", () => {
    const blocks = diffLineBlocks(
      ["const value = 1;", "return value;"],
      ["const value = 2;", "return value;"],
    );

    expect(blocks).toEqual([
      { type: "changed", fromStart: 0, fromEnd: 1, toStart: 0, toEnd: 1 },
      { type: "equal", fromStart: 1, fromEnd: 2, toStart: 1, toEnd: 2 },
    ]);
  });
});

describe("buildTokenFlowTransitionPlan", () => {
  it("builds grouped edit regions with move, enter, and exit tokens", () => {
    const from = makeStep([
      [
        { content: "const ", color: "#f8fafc" },
        { content: "value", color: "#38bdf8" },
        { content: " = ", color: "#f8fafc" },
        { content: "1", color: "#f97316" },
      ],
    ]);
    const to = makeStep([
      [
        { content: "const ", color: "#f8fafc" },
        { content: "value", color: "#38bdf8" },
        { content: " = ", color: "#f8fafc" },
        { content: "count", color: "#22c55e" },
      ],
    ]);

    const plan = buildTokenFlowTransitionPlan({ from, to });

    expect(plan.regions).toHaveLength(1);
    expect(plan.tokens.some((token) => token.sourceToken && token.targetToken)).toBe(true);
    expect(plan.tokens.some((token) => token.sourceToken && !token.targetToken)).toBe(true);
    expect(plan.tokens.some((token) => !token.sourceToken && token.targetToken)).toBe(true);
    expect(plan.tokens.every((token) => token.ripple >= 0 && token.ripple <= 1)).toBe(true);
  });

  it("handles file-edge insertions without losing the change region", () => {
    const from = makeStep([
      [{ content: "return value;", color: "#f8fafc" }],
    ]);
    const to = makeStep([
      [{ content: "const ready = true;", color: "#22c55e" }],
      [{ content: "return value;", color: "#f8fafc" }],
    ]);

    const plan = buildTokenFlowTransitionPlan({ from, to });
    const entering = plan.tokens.filter((token) => !token.sourceToken && token.targetToken);

    expect(plan.regions).toHaveLength(1);
    expect(entering.length).toBeGreaterThan(0);
    expect(entering[0]?.targetAnchor.x).toBeGreaterThanOrEqual(0);
  });
});

describe("getTokenFlowStyle", () => {
  it("returns progressively stronger motion across presets", () => {
    const precise = getTokenFlowStyle("precise", "dark");
    const studio = getTokenFlowStyle("studio", "dark");
    const cinematic = getTokenFlowStyle("cinematic", "dark");

    expect(studio.highlightOpacity).toBeGreaterThan(precise.highlightOpacity);
    expect(cinematic.liftCap).toBeGreaterThan(studio.liftCap);
    expect(cinematic.staggerStrength).toBeGreaterThan(precise.staggerStrength);
  });
});
