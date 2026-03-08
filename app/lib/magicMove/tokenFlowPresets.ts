import type { RenderTheme } from "./codeLayout";
import type { TokenFlowPreset } from "./types";

export type TokenFlowStyle = {
  phases: {
    settleStart: number;
    travelStart: number;
    travelEnd: number;
  };
  liftCap: number;
  arcStrength: number;
  staggerStrength: number;
  enterOffset: number;
  exitLift: number;
  enterScale: number;
  exitScale: number;
  moveScale: number;
  opacityDip: number;
  groupPull: number;
  highlightOpacity: number;
  highlightStrokeOpacity: number;
  connectorOpacity: number;
  highlightPaddingX: number;
  highlightPaddingY: number;
  highlightRadius: number;
  highlightExpand: number;
  highlightStrokeWidth: number;
};

const PRESETS: Record<
  TokenFlowPreset,
  Omit<TokenFlowStyle, "highlightOpacity" | "highlightStrokeOpacity" | "connectorOpacity">
> = {
  precise: {
    phases: {
      settleStart: 0.88,
      travelStart: 0.14,
      travelEnd: 0.84,
    },
    liftCap: 7,
    arcStrength: 0.06,
    staggerStrength: 0.03,
    enterOffset: 3,
    exitLift: 3,
    enterScale: 0.986,
    exitScale: 0.988,
    moveScale: 0.008,
    opacityDip: 0.035,
    groupPull: 0.26,
    highlightPaddingX: 5,
    highlightPaddingY: 3,
    highlightRadius: 16,
    highlightExpand: 4,
    highlightStrokeWidth: 1,
  },
  studio: {
    phases: {
      settleStart: 0.86,
      travelStart: 0.12,
      travelEnd: 0.88,
    },
    liftCap: 9,
    arcStrength: 0.085,
    staggerStrength: 0.05,
    enterOffset: 4,
    exitLift: 4,
    enterScale: 0.978,
    exitScale: 0.982,
    moveScale: 0.012,
    opacityDip: 0.06,
    groupPull: 0.35,
    highlightPaddingX: 7,
    highlightPaddingY: 4,
    highlightRadius: 16,
    highlightExpand: 6,
    highlightStrokeWidth: 1.15,
  },
  cinematic: {
    phases: {
      settleStart: 0.84,
      travelStart: 0.1,
      travelEnd: 0.9,
    },
    liftCap: 12,
    arcStrength: 0.11,
    staggerStrength: 0.075,
    enterOffset: 6,
    exitLift: 5,
    enterScale: 0.968,
    exitScale: 0.976,
    moveScale: 0.017,
    opacityDip: 0.085,
    groupPull: 0.44,
    highlightPaddingX: 9,
    highlightPaddingY: 5,
    highlightRadius: 16,
    highlightExpand: 8,
    highlightStrokeWidth: 1.35,
  },
};

const HIGHLIGHT_OPACITY: Record<RenderTheme, Record<TokenFlowPreset, number>> = {
  dark: {
    precise: 0.05,
    studio: 0.08,
    cinematic: 0.1,
  },
  light: {
    precise: 0.04,
    studio: 0.06,
    cinematic: 0.075,
  },
};

const HIGHLIGHT_STROKE_OPACITY: Record<RenderTheme, Record<TokenFlowPreset, number>> = {
  dark: {
    precise: 0.08,
    studio: 0.12,
    cinematic: 0.16,
  },
  light: {
    precise: 0.06,
    studio: 0.09,
    cinematic: 0.12,
  },
};

const CONNECTOR_OPACITY: Record<RenderTheme, Record<TokenFlowPreset, number>> = {
  dark: {
    precise: 0.025,
    studio: 0.04,
    cinematic: 0.055,
  },
  light: {
    precise: 0.02,
    studio: 0.03,
    cinematic: 0.045,
  },
};

export function getTokenFlowStyle(
  preset: TokenFlowPreset,
  theme: RenderTheme,
): TokenFlowStyle {
  const base = PRESETS[preset];
  return {
    ...base,
    highlightOpacity: HIGHLIGHT_OPACITY[theme][preset],
    highlightStrokeOpacity: HIGHLIGHT_STROKE_OPACITY[theme][preset],
    connectorOpacity: CONNECTOR_OPACITY[theme][preset],
  };
}
