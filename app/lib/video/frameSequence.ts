export type RenderedFrame = {
  name: string;
  blob: Blob;
  timestampMs: number;
};

export type RenderedFrameSequence = {
  frames: RenderedFrame[];
  frameNames: string[];
  frameCount: number;
  fps: number;
  durationMs: number;
  timestamps: number[];
};

export type RenderCanvasFrameSequenceOptions = {
  canvas: HTMLCanvasElement;
  fps: number;
  durationMs: number;
  renderFrame: (ms: number) => void;
  onProgress?: (completedFrames: number, totalFrames: number) => void;
};

export function buildFrameFileName(index: number): string {
  return `frame-${String(index).padStart(6, "0")}.png`;
}

export function buildDeterministicFrameTimestamps(durationMs: number, fps: number): number[] {
  if (durationMs <= 0 || fps <= 0) return [];

  const frameDurationMs = 1000 / fps;
  const timestamps: number[] = [0];
  const epsilon = 0.000001;

  for (let frameIndex = 1; frameIndex * frameDurationMs < durationMs - epsilon; frameIndex++) {
    const nextTimestamp = frameIndex * frameDurationMs;
    timestamps.push(nextTimestamp);
  }

  const lastTimestamp = timestamps[timestamps.length - 1];
  if (Math.abs(lastTimestamp - durationMs) > epsilon) {
    timestamps.push(durationMs);
  }

  return timestamps;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error(`Failed to serialize canvas to ${type}`));
        return;
      }
      resolve(blob);
    }, type);
  });
}

export async function renderCanvasFrameSequence(
  opts: RenderCanvasFrameSequenceOptions,
): Promise<RenderedFrameSequence> {
  const timestamps = buildDeterministicFrameTimestamps(opts.durationMs, opts.fps);
  const totalFrames = timestamps.length;
  const frames: RenderedFrame[] = [];

  for (const [index, timestampMs] of timestamps.entries()) {
    opts.renderFrame(timestampMs);
    const blob = await canvasToBlob(opts.canvas, "image/png");
    frames.push({
      name: buildFrameFileName(index),
      blob,
      timestampMs,
    });
    opts.onProgress?.(index + 1, totalFrames);
  }

  if (timestamps[timestamps.length - 1] !== opts.durationMs) {
    throw new Error("Frame sequence did not include the final export timestamp");
  }

  return {
    frames,
    frameNames: frames.map((frame) => frame.name),
    frameCount: totalFrames,
    fps: opts.fps,
    durationMs: opts.durationMs,
    timestamps,
  };
}
