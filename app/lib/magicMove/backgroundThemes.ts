/**
 * Background gradient themes for wrapping the code card in a visually
 * appealing gradient (similar to ray.so).  Definitions are canvas-native
 * so they work identically in preview and video export.
 */

// ---------- types ----------

export type GradientStop = { offset: number; color: string };

export type GradientLayer = {
  /** Normalised coordinates (0-1) resolved against the full canvas size. */
  type: "linear";
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  stops: GradientStop[];
};

export type BackgroundTheme = {
  id: string;
  name: string;
  /** Colour shown in the Combobox swatch (first dominant colour). */
  previewColor: string;
  layers: GradientLayer[];
};

// ---------- presets ----------

const THEMES: BackgroundTheme[] = [
  {
    id: "sunset",
    name: "Sunset",
    previewColor: "#f97316",
    layers: [
      {
        type: "linear",
        x0: 0, y0: 0, x1: 1, y1: 1,
        stops: [
          { offset: 0, color: "#f97316" },
          { offset: 0.5, color: "#ec4899" },
          { offset: 1, color: "#8b5cf6" },
        ],
      },
    ],
  },
  {
    id: "midnight",
    name: "Midnight",
    previewColor: "#1e3a5f",
    layers: [
      {
        type: "linear",
        x0: 0, y0: 0, x1: 1, y1: 1,
        stops: [
          { offset: 0, color: "#0f172a" },
          { offset: 0.5, color: "#1e3a5f" },
          { offset: 1, color: "#312e81" },
        ],
      },
    ],
  },
  {
    id: "forest",
    name: "Forest",
    previewColor: "#16a34a",
    layers: [
      {
        type: "linear",
        x0: 0, y0: 0, x1: 1, y1: 1,
        stops: [
          { offset: 0, color: "#064e3b" },
          { offset: 0.5, color: "#16a34a" },
          { offset: 1, color: "#a3e635" },
        ],
      },
    ],
  },
  {
    id: "sand",
    name: "Sand",
    previewColor: "#d4a574",
    layers: [
      {
        type: "linear",
        x0: 0, y0: 0, x1: 1, y1: 1,
        stops: [
          { offset: 0, color: "#fef3c7" },
          { offset: 0.5, color: "#d4a574" },
          { offset: 1, color: "#92400e" },
        ],
      },
    ],
  },
  {
    id: "mono",
    name: "Mono",
    previewColor: "#6b7280",
    layers: [
      {
        type: "linear",
        x0: 0, y0: 0, x1: 0, y1: 1,
        stops: [
          { offset: 0, color: "#374151" },
          { offset: 1, color: "#111827" },
        ],
      },
    ],
  },
  {
    id: "breeze",
    name: "Breeze",
    previewColor: "#38bdf8",
    layers: [
      {
        type: "linear",
        x0: 0, y0: 0, x1: 1, y1: 1,
        stops: [
          { offset: 0, color: "#e0f2fe" },
          { offset: 0.5, color: "#38bdf8" },
          { offset: 1, color: "#0284c7" },
        ],
      },
    ],
  },
  {
    id: "candy",
    name: "Candy",
    previewColor: "#f472b6",
    layers: [
      {
        type: "linear",
        x0: 0, y0: 0, x1: 1, y1: 1,
        stops: [
          { offset: 0, color: "#f472b6" },
          { offset: 0.5, color: "#c084fc" },
          { offset: 1, color: "#60a5fa" },
        ],
      },
    ],
  },
  {
    id: "crimson",
    name: "Crimson",
    previewColor: "#dc2626",
    layers: [
      {
        type: "linear",
        x0: 0, y0: 0, x1: 1, y1: 1,
        stops: [
          { offset: 0, color: "#7f1d1d" },
          { offset: 0.5, color: "#dc2626" },
          { offset: 1, color: "#f97316" },
        ],
      },
    ],
  },
  {
    id: "falcon",
    name: "Falcon",
    previewColor: "#6366f1",
    layers: [
      {
        type: "linear",
        x0: 0, y0: 0, x1: 1, y1: 1,
        stops: [
          { offset: 0, color: "#1e1b4b" },
          { offset: 0.5, color: "#6366f1" },
          { offset: 1, color: "#a78bfa" },
        ],
      },
    ],
  },
  {
    id: "meadow",
    name: "Meadow",
    previewColor: "#34d399",
    layers: [
      {
        type: "linear",
        x0: 0, y0: 0, x1: 1, y1: 1,
        stops: [
          { offset: 0, color: "#fde68a" },
          { offset: 0.5, color: "#34d399" },
          { offset: 1, color: "#06b6d4" },
        ],
      },
    ],
  },
  {
    id: "raindrop",
    name: "Raindrop",
    previewColor: "#818cf8",
    layers: [
      {
        type: "linear",
        x0: 0, y0: 0, x1: 1, y1: 1,
        stops: [
          { offset: 0, color: "#e0e7ff" },
          { offset: 0.5, color: "#818cf8" },
          { offset: 1, color: "#4338ca" },
        ],
      },
    ],
  },
];

// ---------- lookup ----------

export function getBackgroundThemeById(id: string): BackgroundTheme | undefined {
  return THEMES.find((t) => t.id === id);
}

export function getAllBackgroundThemes(): BackgroundTheme[] {
  return THEMES;
}

// ---------- canvas drawing ----------

/**
 * Draws a background gradient onto the full canvas area.
 * Call this before drawing the code card.
 */
export function drawBackgroundGradient(opts: {
  ctx: CanvasRenderingContext2D;
  theme: BackgroundTheme;
  width: number;
  height: number;
  cornerRadius?: number;
}) {
  const { ctx, theme, width, height, cornerRadius } = opts;

  if (cornerRadius && cornerRadius > 0) {
    ctx.save();
    const r = Math.min(cornerRadius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(width, 0, width, height, r);
    ctx.arcTo(width, height, 0, height, r);
    ctx.arcTo(0, height, 0, 0, r);
    ctx.arcTo(0, 0, width, 0, r);
    ctx.closePath();
    ctx.clip();
  }

  for (const layer of theme.layers) {
    const grad = ctx.createLinearGradient(
      layer.x0 * width,
      layer.y0 * height,
      layer.x1 * width,
      layer.y1 * height,
    );
    for (const stop of layer.stops) {
      grad.addColorStop(stop.offset, stop.color);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  if (cornerRadius && cornerRadius > 0) {
    ctx.restore();
  }
}

/**
 * Draws a subtle shadow behind the code card when background is visible.
 */
export function drawCardShadow(opts: {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
}) {
  const { ctx, x, y, width, height, cornerRadius } = opts;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 8;

  ctx.fillStyle = "rgba(0, 0, 0, 0)";
  const r = Math.min(cornerRadius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
  // Fill with an opaque colour so the shadow actually renders;
  // the shape itself will be covered by the card background.
  ctx.fillStyle = "#000";
  ctx.fill();
  ctx.restore();
}
