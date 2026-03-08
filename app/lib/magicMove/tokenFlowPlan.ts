import type { LayoutResult, LaidToken } from "./codeLayout";
import type { TokenLine } from "./shikiHighlighter";

export type TokenFlowStep = {
  code: string;
  tokenLines: TokenLine[];
  layout: LayoutResult;
};

export type TokenFlowAnchor = {
  x: number;
  y: number;
  color: string;
};

export type TokenFlowRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TokenFlowPlannedToken = {
  key: string;
  content: string;
  sourceToken: LaidToken | null;
  targetToken: LaidToken | null;
  sourceAnchor: TokenFlowAnchor;
  targetAnchor: TokenFlowAnchor;
  sourceColor: string;
  targetColor: string;
  regionIndex: number;
  emphasis: number;
  ripple: number;
};

export type TokenFlowRegion = {
  index: number;
  sourceRect: TokenFlowRect | null;
  targetRect: TokenFlowRect | null;
  centroid: { x: number; y: number };
  color: string;
  emphasis: number;
};

export type LineDiffBlock = {
  type: "equal" | "changed";
  fromStart: number;
  fromEnd: number;
  toStart: number;
  toEnd: number;
};

export type TokenFlowTransitionPlan = {
  tokens: TokenFlowPlannedToken[];
  regions: TokenFlowRegion[];
  editCentroid: { x: number; y: number };
};

type LayoutLine = {
  index: number;
  text: string;
  tokens: LaidToken[];
};

type MatchedToken = {
  from: LaidToken;
  to: LaidToken;
  regionIndex: number;
  emphasis: number;
};

type ChangedRegionCandidate = {
  sourceTokens: LaidToken[];
  targetTokens: LaidToken[];
};

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function getLineText(line: TokenLine): string {
  return line.tokens.map((token) => token.content.replace(/\t/g, "  ")).join("");
}

function buildLayoutLines(step: TokenFlowStep): LayoutLine[] {
  let cursor = 0;
  return step.tokenLines.map((line, index) => {
    const count = line.tokens.length;
    const tokens = step.layout.tokens.slice(cursor, cursor + count);
    cursor += count;
    return {
      index,
      text: getLineText(line),
      tokens,
    };
  });
}

function flattenLineTokens(lines: LayoutLine[], start: number, end: number): LaidToken[] {
  return lines.slice(start, end).flatMap((line) => line.tokens);
}

function buildLcsMatrix(from: string[], to: string[]): number[][] {
  const dp = Array.from({ length: from.length + 1 }, () => Array.from({ length: to.length + 1 }, () => 0));

  for (let i = from.length - 1; i >= 0; i--) {
    for (let j = to.length - 1; j >= 0; j--) {
      dp[i]![j] = from[i] === to[j]
        ? dp[i + 1]![j + 1]! + 1
        : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }

  return dp;
}

export function diffLineBlocks(from: string[], to: string[]): LineDiffBlock[] {
  const dp = buildLcsMatrix(from, to);
  const matches: Array<{ from: number; to: number }> = [];

  let i = 0;
  let j = 0;
  while (i < from.length && j < to.length) {
    if (from[i] === to[j]) {
      matches.push({ from: i, to: j });
      i++;
      j++;
      continue;
    }

    if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      i++;
    } else {
      j++;
    }
  }

  const blocks: LineDiffBlock[] = [];
  let fromCursor = 0;
  let toCursor = 0;
  let matchCursor = 0;

  while (matchCursor < matches.length) {
    const start = matches[matchCursor]!;
    let end = start;

    while (
      matchCursor + 1 < matches.length &&
      matches[matchCursor + 1]!.from === end.from + 1 &&
      matches[matchCursor + 1]!.to === end.to + 1
    ) {
      matchCursor++;
      end = matches[matchCursor]!;
    }

    if (fromCursor < start.from || toCursor < start.to) {
      blocks.push({
        type: "changed",
        fromStart: fromCursor,
        fromEnd: start.from,
        toStart: toCursor,
        toEnd: start.to,
      });
    }

    blocks.push({
      type: "equal",
      fromStart: start.from,
      fromEnd: end.from + 1,
      toStart: start.to,
      toEnd: end.to + 1,
    });

    fromCursor = end.from + 1;
    toCursor = end.to + 1;
    matchCursor++;
  }

  if (fromCursor < from.length || toCursor < to.length) {
    blocks.push({
      type: "changed",
      fromStart: fromCursor,
      fromEnd: from.length,
      toStart: toCursor,
      toEnd: to.length,
    });
  }

  return blocks.length > 0 ? blocks : [{
    type: "changed",
    fromStart: 0,
    fromEnd: from.length,
    toStart: 0,
    toEnd: to.length,
  }];
}

function pairTokensByOccurrence(
  fromTokens: LaidToken[],
  toTokens: LaidToken[],
): { matches: Array<{ from: LaidToken; to: LaidToken }>; unmatchedFrom: LaidToken[]; unmatchedTo: LaidToken[] } {
  const toQueues = new Map<string, LaidToken[]>();
  const matches: Array<{ from: LaidToken; to: LaidToken }> = [];
  const unmatchedFrom: LaidToken[] = [];

  for (const token of toTokens) {
    const queue = toQueues.get(token.content) ?? [];
    queue.push(token);
    toQueues.set(token.content, queue);
  }

  for (const token of fromTokens) {
    const queue = toQueues.get(token.content);
    if (queue && queue.length > 0) {
      const counterpart = queue.shift()!;
      matches.push({ from: token, to: counterpart });
    } else {
      unmatchedFrom.push(token);
    }
  }

  const unmatchedTo: LaidToken[] = [];
  for (const queue of toQueues.values()) {
    unmatchedTo.push(...queue);
  }

  return { matches, unmatchedFrom, unmatchedTo };
}

function pairChangedBlock(
  fromLines: LayoutLine[],
  toLines: LayoutLine[],
  regionIndex: number,
): {
  matches: MatchedToken[];
  unmatchedFrom: LaidToken[];
  unmatchedTo: LaidToken[];
} {
  const matchedFrom = new Set<string>();
  const matchedTo = new Set<string>();
  const matches: MatchedToken[] = [];
  const overlap = Math.min(fromLines.length, toLines.length);

  for (let index = 0; index < overlap; index++) {
    const paired = pairTokensByOccurrence(fromLines[index]!.tokens, toLines[index]!.tokens);
    for (const pair of paired.matches) {
      matchedFrom.add(pair.from.key);
      matchedTo.add(pair.to.key);
      matches.push({
        from: pair.from,
        to: pair.to,
        regionIndex,
        emphasis: 1,
      });
    }
  }

  const remainingFrom = fromLines.flatMap((line) => line.tokens).filter((token) => !matchedFrom.has(token.key));
  const remainingTo = toLines.flatMap((line) => line.tokens).filter((token) => !matchedTo.has(token.key));
  const fallback = pairTokensByOccurrence(remainingFrom, remainingTo);

  for (const pair of fallback.matches) {
    matchedFrom.add(pair.from.key);
    matchedTo.add(pair.to.key);
    matches.push({
      from: pair.from,
      to: pair.to,
      regionIndex,
      emphasis: 1,
    });
  }

  return {
    matches,
    unmatchedFrom: remainingFrom.filter((token) => !matchedFrom.has(token.key)),
    unmatchedTo: remainingTo.filter((token) => !matchedTo.has(token.key)),
  };
}

function buildRect(tokens: LaidToken[]): TokenFlowRect | null {
  if (tokens.length === 0) return null;
  const minX = Math.min(...tokens.map((token) => token.x));
  const minY = Math.min(...tokens.map((token) => token.y));
  const maxX = Math.max(...tokens.map((token) => token.x + token.w));
  const maxY = Math.max(...tokens.map((token) => token.y + token.h));
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function rectCenter(rect: TokenFlowRect | null): { x: number; y: number } | null {
  if (!rect) return null;
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

function computeRegionColor(tokens: LaidToken[], fallback: string): string {
  return tokens.find((token) => token.color)?.color ?? fallback;
}

function findAnchor(
  orderedTokens: LaidToken[],
  token: LaidToken,
  counterpartMap: Map<string, LaidToken>,
  pull: number,
): TokenFlowAnchor {
  const index = orderedTokens.findIndex((candidate) => candidate.key === token.key);
  let prev: { current: LaidToken; counterpart: LaidToken } | null = null;
  let next: { current: LaidToken; counterpart: LaidToken } | null = null;

  for (let i = index - 1; i >= 0; i--) {
    const current = orderedTokens[i]!;
    const counterpart = counterpartMap.get(current.key);
    if (counterpart) {
      prev = { current, counterpart };
      break;
    }
  }

  for (let i = index + 1; i < orderedTokens.length; i++) {
    const current = orderedTokens[i]!;
    const counterpart = counterpartMap.get(current.key);
    if (counterpart) {
      next = { current, counterpart };
      break;
    }
  }

  if (prev && next) {
    const dx = next.current.x - prev.current.x;
    const dy = next.current.y - prev.current.y;
    let ratio = 0.5;

    if (Math.abs(dx) >= Math.abs(dy) && Math.abs(dx) > 1) {
      ratio = clamp01((token.x - prev.current.x) / dx);
    } else if (Math.abs(dy) > 1) {
      ratio = clamp01((token.y - prev.current.y) / dy);
    }

    const baseCurrentX = lerp(prev.current.x, next.current.x, ratio);
    const baseCurrentY = lerp(prev.current.y, next.current.y, ratio);

    return {
      x: lerp(prev.counterpart.x, next.counterpart.x, ratio) + (token.x - baseCurrentX) * pull,
      y: lerp(prev.counterpart.y, next.counterpart.y, ratio) + (token.y - baseCurrentY) * pull,
      color: ratio < 0.5 ? prev.counterpart.color : next.counterpart.color,
    };
  }

  if (prev) {
    return {
      x: prev.counterpart.x + (token.x - prev.current.x) * pull,
      y: prev.counterpart.y + (token.y - prev.current.y) * pull,
      color: prev.counterpart.color,
    };
  }

  if (next) {
    return {
      x: next.counterpart.x + (token.x - next.current.x) * pull,
      y: next.counterpart.y + (token.y - next.current.y) * pull,
      color: next.counterpart.color,
    };
  }

  return {
    x: token.x,
    y: token.y,
    color: token.color,
  };
}

function buildFallbackPlan(from: TokenFlowStep, to: TokenFlowStep): TokenFlowTransitionPlan {
  const paired = pairTokensByOccurrence(from.layout.tokens, to.layout.tokens);
  const matchedToByFrom = new Map<string, LaidToken>();
  const matchedFromByTo = new Map<string, LaidToken>();
  const tokens: TokenFlowPlannedToken[] = [];

  for (const pair of paired.matches) {
    matchedToByFrom.set(pair.from.key, pair.to);
    matchedFromByTo.set(pair.to.key, pair.from);
    tokens.push({
      key: `move:${pair.from.key}:${pair.to.key}`,
      content: pair.to.content,
      sourceToken: pair.from,
      targetToken: pair.to,
      sourceAnchor: { x: pair.from.x, y: pair.from.y, color: pair.from.color },
      targetAnchor: { x: pair.to.x, y: pair.to.y, color: pair.to.color },
      sourceColor: pair.from.color,
      targetColor: pair.to.color,
      regionIndex: -1,
      emphasis: 0,
      ripple: 0,
    });
  }

  for (const token of paired.unmatchedFrom) {
    const anchor = findAnchor(from.layout.tokens, token, matchedToByFrom, 0.35);
    tokens.push({
      key: `exit:${token.key}`,
      content: token.content,
      sourceToken: token,
      targetToken: null,
      sourceAnchor: { x: token.x, y: token.y, color: token.color },
      targetAnchor: anchor,
      sourceColor: token.color,
      targetColor: anchor.color,
      regionIndex: -1,
      emphasis: 0.6,
      ripple: 0.4,
    });
  }

  for (const token of paired.unmatchedTo) {
    const anchor = findAnchor(to.layout.tokens, token, matchedFromByTo, 0.35);
    tokens.push({
      key: `enter:${token.key}`,
      content: token.content,
      sourceToken: null,
      targetToken: token,
      sourceAnchor: anchor,
      targetAnchor: { x: token.x, y: token.y, color: token.color },
      sourceColor: anchor.color,
      targetColor: token.color,
      regionIndex: -1,
      emphasis: 0.6,
      ripple: 0.4,
    });
  }

  const center = {
    x: to.layout.tokens[0]?.x ?? from.layout.tokens[0]?.x ?? 0,
    y: to.layout.tokens[0]?.y ?? from.layout.tokens[0]?.y ?? 0,
  };

  return {
    tokens,
    regions: [],
    editCentroid: center,
  };
}

export function buildTokenFlowTransitionPlan(opts: {
  from: TokenFlowStep;
  to: TokenFlowStep;
}): TokenFlowTransitionPlan {
  try {
    const fromLines = buildLayoutLines(opts.from);
    const toLines = buildLayoutLines(opts.to);
    const lineBlocks = diffLineBlocks(fromLines.map((line) => line.text), toLines.map((line) => line.text));

    const matchedToByFrom = new Map<string, LaidToken>();
    const matchedFromByTo = new Map<string, LaidToken>();
    const tokens: TokenFlowPlannedToken[] = [];
    const changedRegions: ChangedRegionCandidate[] = [];
    const unmatchedFrom: Array<{ token: LaidToken; regionIndex: number; emphasis: number }> = [];
    const unmatchedTo: Array<{ token: LaidToken; regionIndex: number; emphasis: number }> = [];
    let regionIndex = 0;

    for (const block of lineBlocks) {
      if (block.type === "equal") {
        const count = Math.min(block.fromEnd - block.fromStart, block.toEnd - block.toStart);
        for (let offset = 0; offset < count; offset++) {
          const fromLine = fromLines[block.fromStart + offset]!;
          const toLine = toLines[block.toStart + offset]!;
          const paired = pairTokensByOccurrence(fromLine.tokens, toLine.tokens);

          for (const pair of paired.matches) {
            matchedToByFrom.set(pair.from.key, pair.to);
            matchedFromByTo.set(pair.to.key, pair.from);
            tokens.push({
              key: `move:${pair.from.key}:${pair.to.key}`,
              content: pair.to.content,
              sourceToken: pair.from,
              targetToken: pair.to,
              sourceAnchor: { x: pair.from.x, y: pair.from.y, color: pair.from.color },
              targetAnchor: { x: pair.to.x, y: pair.to.y, color: pair.to.color },
              sourceColor: pair.from.color,
              targetColor: pair.to.color,
              regionIndex: -1,
              emphasis: 0,
              ripple: 0,
            });
          }

          for (const token of paired.unmatchedFrom) {
            unmatchedFrom.push({ token, regionIndex: -1, emphasis: 0.45 });
          }
          for (const token of paired.unmatchedTo) {
            unmatchedTo.push({ token, regionIndex: -1, emphasis: 0.45 });
          }
        }
        continue;
      }

      const sourceTokens = flattenLineTokens(fromLines, block.fromStart, block.fromEnd);
      const targetTokens = flattenLineTokens(toLines, block.toStart, block.toEnd);
      const emphasis = clamp01((sourceTokens.length + targetTokens.length) / 12) * 0.6 + 0.4;
      changedRegions.push({ sourceTokens, targetTokens });

      const paired = pairChangedBlock(
        fromLines.slice(block.fromStart, block.fromEnd),
        toLines.slice(block.toStart, block.toEnd),
        regionIndex,
      );

      for (const pair of paired.matches) {
        matchedToByFrom.set(pair.from.key, pair.to);
        matchedFromByTo.set(pair.to.key, pair.from);
        tokens.push({
          key: `move:${pair.from.key}:${pair.to.key}`,
          content: pair.to.content,
          sourceToken: pair.from,
          targetToken: pair.to,
          sourceAnchor: { x: pair.from.x, y: pair.from.y, color: pair.from.color },
          targetAnchor: { x: pair.to.x, y: pair.to.y, color: pair.to.color },
          sourceColor: pair.from.color,
          targetColor: pair.to.color,
          regionIndex,
          emphasis: pair.emphasis * emphasis,
          ripple: 0,
        });
      }

      for (const token of paired.unmatchedFrom) {
        unmatchedFrom.push({ token, regionIndex, emphasis });
      }
      for (const token of paired.unmatchedTo) {
        unmatchedTo.push({ token, regionIndex, emphasis });
      }

      regionIndex++;
    }

    for (const entry of unmatchedFrom) {
      const anchor = findAnchor(opts.from.layout.tokens, entry.token, matchedToByFrom, 0.35);
      tokens.push({
        key: `exit:${entry.token.key}`,
        content: entry.token.content,
        sourceToken: entry.token,
        targetToken: null,
        sourceAnchor: { x: entry.token.x, y: entry.token.y, color: entry.token.color },
        targetAnchor: anchor,
        sourceColor: entry.token.color,
        targetColor: anchor.color,
        regionIndex: entry.regionIndex,
        emphasis: entry.emphasis,
        ripple: 0,
      });
    }

    for (const entry of unmatchedTo) {
      const anchor = findAnchor(opts.to.layout.tokens, entry.token, matchedFromByTo, 0.35);
      tokens.push({
        key: `enter:${entry.token.key}`,
        content: entry.token.content,
        sourceToken: null,
        targetToken: entry.token,
        sourceAnchor: anchor,
        targetAnchor: { x: entry.token.x, y: entry.token.y, color: entry.token.color },
        sourceColor: anchor.color,
        targetColor: entry.token.color,
        regionIndex: entry.regionIndex,
        emphasis: entry.emphasis,
        ripple: 0,
      });
    }

    const regions: TokenFlowRegion[] = changedRegions.map((region, index) => {
      const sourceRect = buildRect(region.sourceTokens);
      const targetRect = buildRect(region.targetTokens);
      const sourceCenter = rectCenter(sourceRect);
      const targetCenter = rectCenter(targetRect);
      const centroid = targetCenter ?? sourceCenter ?? { x: 0, y: 0 };

      return {
        index,
        sourceRect,
        targetRect,
        centroid,
        color: computeRegionColor(region.targetTokens, computeRegionColor(region.sourceTokens, opts.to.layout.fg)),
        emphasis: clamp01((region.sourceTokens.length + region.targetTokens.length) / 12) * 0.6 + 0.4,
      };
    });

    const regionCenters = regions.map((region) => region.centroid);
    const editCentroid = regionCenters.length > 0
      ? {
        x: regionCenters.reduce((sum, region) => sum + region.x, 0) / regionCenters.length,
        y: regionCenters.reduce((sum, region) => sum + region.y, 0) / regionCenters.length,
      }
      : {
        x: opts.to.layout.tokens[0]?.x ?? opts.from.layout.tokens[0]?.x ?? 0,
        y: opts.to.layout.tokens[0]?.y ?? opts.from.layout.tokens[0]?.y ?? 0,
      };

    let maxDistance = 1;
    for (const token of tokens) {
      const anchorX = token.sourceToken?.x ?? token.targetToken?.x ?? token.targetAnchor.x;
      const anchorY = token.sourceToken?.y ?? token.targetToken?.y ?? token.targetAnchor.y;
      maxDistance = Math.max(maxDistance, Math.hypot(anchorX - editCentroid.x, anchorY - editCentroid.y));
    }

    for (const token of tokens) {
      const anchorX = token.sourceToken?.x ?? token.targetToken?.x ?? token.targetAnchor.x;
      const anchorY = token.sourceToken?.y ?? token.targetToken?.y ?? token.targetAnchor.y;
      token.ripple = Math.hypot(anchorX - editCentroid.x, anchorY - editCentroid.y) / maxDistance;
    }

    return {
      tokens,
      regions,
      editCentroid,
    };
  } catch {
    return buildFallbackPlan(opts.from, opts.to);
  }
}
