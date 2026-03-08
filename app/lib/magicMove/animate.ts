import type { TokenFlowStyle } from "./tokenFlowPresets";
import type {
  TokenFlowTransitionPlan,
} from "./tokenFlowPlan";

export type AnimatedToken = {
  content: string;
  color: string;
  x: number;
  y: number;
  opacity: number;
  scale?: number;
};

export type AnimatedRegionHighlight = {
  kind: "plate" | "connector";
} & (
  | {
    kind: "plate";
    x: number;
    y: number;
    width: number;
    height: number;
    radius: number;
    color: string;
    opacity: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeWidth?: number;
  }
  | {
    kind: "connector";
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    width: number;
    color: string;
    opacity: number;
  }
);

export type AnimatedScene = {
  tokens: AnimatedToken[];
  regionHighlights: AnimatedRegionHighlight[];
};

type ParsedColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeInOutQuint(t: number): number {
  return t < 0.5
    ? 16 * t * t * t * t * t
    : 1 - Math.pow(-2 * t + 2, 5) / 2;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function remapProgress(progress: number, start: number, end: number): number {
  if (end <= start) {
    return progress >= end ? 1 : 0;
  }
  return clamp01((progress - start) / (end - start));
}

function formatAlpha(alpha: number): string {
  return String(Number(alpha.toFixed(3)));
}

function parseHexColor(color: string): ParsedColor | null {
  const hex = color.slice(1);

  if (hex.length === 3 || hex.length === 4) {
    const [r, g, b, a = "f"] = hex;
    return {
      r: Number.parseInt(r + r, 16),
      g: Number.parseInt(g + g, 16),
      b: Number.parseInt(b + b, 16),
      a: Number.parseInt(a + a, 16) / 255,
    };
  }

  if (hex.length === 6 || hex.length === 8) {
    const alpha = hex.length === 8 ? hex.slice(6, 8) : "ff";
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
      a: Number.parseInt(alpha, 16) / 255,
    };
  }

  return null;
}

function parseRgbColor(color: string): ParsedColor | null {
  const match = color.match(/^rgba?\((.+)\)$/i);
  if (!match) return null;

  const parts = match[1]!.split(",").map((part) => part.trim());
  if (parts.length < 3 || parts.length > 4) return null;

  const [r, g, b, a = "1"] = parts;
  const parsed = [r, g, b].map((value) => Number.parseFloat(value));
  const alpha = Number.parseFloat(a);

  if (parsed.some((value) => Number.isNaN(value)) || Number.isNaN(alpha)) {
    return null;
  }

  return {
    r: clamp01(parsed[0]! / 255) * 255,
    g: clamp01(parsed[1]! / 255) * 255,
    b: clamp01(parsed[2]! / 255) * 255,
    a: clamp01(alpha),
  };
}

function parseColor(color: string): ParsedColor | null {
  if (color.startsWith("#")) {
    return parseHexColor(color);
  }
  if (color.startsWith("rgb")) {
    return parseRgbColor(color);
  }
  return null;
}

function mixColor(fromColor: string, toColor: string, t: number): string {
  const from = parseColor(fromColor);
  const to = parseColor(toColor);

  if (!from || !to) {
    return t >= 1 ? toColor : fromColor;
  }

  const eased = clamp01(t);
  const r = Math.round(lerp(from.r, to.r, eased));
  const g = Math.round(lerp(from.g, to.g, eased));
  const b = Math.round(lerp(from.b, to.b, eased));
  const a = lerp(from.a, to.a, eased);

  return `rgba(${r}, ${g}, ${b}, ${formatAlpha(a)})`;
}

export function animateLayouts(opts: {
  plan: TokenFlowTransitionPlan;
  progress: number;
  style: TokenFlowStyle;
  backgroundColor: string;
}): AnimatedScene {
  const rawProgress = clamp01(opts.progress);
  const staggeredTravel = (ripple: number) =>
    remapProgress(rawProgress, ripple * opts.style.staggerStrength, 1);

  const travelStart = opts.style.phases.travelStart;
  const travelEnd = opts.style.phases.travelEnd;
  void opts.style.phases.settleStart;

  const tokens: AnimatedToken[] = opts.plan.tokens.map((token) => {
    const stagedProgress = staggeredTravel(token.ripple);
    const accentT = easeInOutQuint(remapProgress(stagedProgress, travelStart, travelEnd));
    const moveT = easeInOutCubic(remapProgress(stagedProgress, travelStart * 0.55, 1));
    const enterT = easeOutCubic(remapProgress(stagedProgress, travelStart * 0.82, 1));
    const enterOpacityT = easeOutCubic(remapProgress(stagedProgress, travelStart * 0.72, 0.92));
    const exitMoveT = easeOutCubic(remapProgress(stagedProgress, travelStart * 0.2, 0.96));
    const exitFadeT = easeInOutCubic(remapProgress(stagedProgress, travelStart * 0.12, 0.94));
    const enterScaleT = easeOutCubic(remapProgress(
      stagedProgress,
      travelStart,
      lerp(travelStart, travelEnd, 0.72),
    ));

    if (token.sourceToken && token.targetToken) {
      const dx = token.targetToken.x - token.sourceToken.x;
      const dy = token.targetToken.y - token.sourceToken.y;
      const distance = Math.hypot(dx, dy);
      const motionStrength = clamp01(distance / 140);
      const bell = Math.sin(Math.PI * accentT);
      const lift = Math.min(opts.style.liftCap, distance * opts.style.arcStrength);

      return {
        content: token.targetToken.content,
        color: mixColor(token.sourceColor, token.targetColor, moveT),
        x: lerp(token.sourceToken.x, token.targetToken.x, moveT),
        y: lerp(token.sourceToken.y, token.targetToken.y, moveT) - bell * lift,
        opacity: 1 - bell * opts.style.opacityDip * motionStrength * (0.45 + token.emphasis * 0.55),
        scale: 1 + bell * opts.style.moveScale * motionStrength * (0.45 + token.emphasis * 0.55),
      };
    }

    if (token.sourceToken) {
      return {
        content: token.sourceToken.content,
        color: mixColor(token.sourceColor, token.targetColor, exitMoveT * 0.72),
        x: lerp(token.sourceToken.x, token.targetAnchor.x, exitMoveT * opts.style.groupPull),
        y: lerp(token.sourceToken.y, token.targetAnchor.y, exitMoveT * opts.style.groupPull)
          - exitMoveT * opts.style.exitLift,
        opacity: 1 - exitFadeT,
        scale: lerp(1, opts.style.exitScale, exitMoveT),
      };
    }

    return {
      content: token.targetToken?.content ?? token.content,
      color: mixColor(token.sourceColor, token.targetColor, enterT),
      x: lerp(token.sourceAnchor.x, token.targetToken?.x ?? token.targetAnchor.x, enterT),
      y: lerp(token.sourceAnchor.y, token.targetToken?.y ?? token.targetAnchor.y, enterT)
        + (1 - enterT) * opts.style.enterOffset,
      opacity: enterOpacityT,
      scale: lerp(opts.style.enterScale, 1, enterScaleT),
    };
  });

  return {
    tokens,
    regionHighlights: [],
  };
}
