import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import type { RenderedFrame } from "./frameSequence";

let ffmpeg: FFmpeg | null = null;

async function ensureFFmpeg(): Promise<FFmpeg> {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();

    // Load core from CDN
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
    } catch (e) {
      throw new Error(`Failed to load FFmpeg: ${e}`);
    }
  }

  return ffmpeg;
}

function createProgressHandler(
  onProgress: ((progress: number) => void) | undefined,
  totalDurationMs?: number,
) {
  return ({ progress, time }: { progress: number; time: number }) => {
    let p = progress;
    if (typeof p !== "number" || p < 0 || p > 1) {
      if (totalDurationMs && totalDurationMs > 0) {
        p = time / 1000 / totalDurationMs;
      } else {
        p = 0;
      }
    }
    onProgress?.(Math.max(0, Math.min(1, p)));
  };
}

function toOutputBlob(data: Uint8Array | string | ArrayLike<number>, type: string): Blob {
  let uint8Array: Uint8Array;
  if (data instanceof Uint8Array) {
    uint8Array = new Uint8Array(data.buffer.slice(0));
  } else if (typeof data === "string") {
    const binaryString = atob(data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    uint8Array = bytes;
  } else {
    uint8Array = new Uint8Array(data as ArrayLike<number>);
  }

  return new Blob([uint8Array as BlobPart], { type });
}

async function writeFrameSequence(ffmpegInstance: FFmpeg, frames: RenderedFrame[]) {
  for (const frame of frames) {
    await ffmpegInstance.writeFile(frame.name, await fetchFile(frame.blob));
  }
}

async function deleteFiles(ffmpegInstance: FFmpeg, fileNames: string[]) {
  for (const fileName of fileNames) {
    try {
      await ffmpegInstance.deleteFile(fileName);
    } catch {}
  }
}

export async function convertWebmToMp4(
  webmBlob: Blob,
  onProgress?: (progress: number) => void,
  totalDurationMs?: number,
  audioBlob?: Blob,
): Promise<Blob> {
  const ffmpegInstance = await ensureFFmpeg();

  const inputName = "input.webm";
  const audioName = "audio.wav";
  const outputName = "output.mp4";
  const progressHandler = createProgressHandler(onProgress, totalDurationMs);

  ffmpegInstance.on("progress", progressHandler);

  try {
    await ffmpegInstance.writeFile(inputName, await fetchFile(webmBlob));

    if (audioBlob) {
      await ffmpegInstance.writeFile(audioName, await fetchFile(audioBlob));
    }

    // Convert with H.264, optionally muxing audio
    const args = audioBlob
      ? [
          "-i", inputName,
          "-i", audioName,
          "-c:v", "libx264",
          "-preset", "medium",
          "-crf", "18",
          "-pix_fmt", "yuv420p",
          "-c:a", "aac",
          "-b:a", "128k",
          "-map", "0:v:0",
          "-map", "1:a:0",
          "-shortest",
          outputName,
        ]
      : [
          "-i", inputName,
          "-c:v", "libx264",
          "-preset", "medium",
          "-crf", "18",
          "-pix_fmt", "yuv420p",
          "-an",
          outputName,
        ];

    await ffmpegInstance.exec(args);

    const data = await ffmpegInstance.readFile(outputName);
    return toOutputBlob(data, "video/mp4");
  } catch (error) {
    throw new Error(`MP4 conversion failed: ${error}`);
  } finally {
    await deleteFiles(ffmpegInstance, [inputName, outputName, ...(audioBlob ? [audioName] : [])]);
    ffmpegInstance.off("progress", progressHandler);
  }
}

export async function encodeFrameSequenceToWebm(opts: {
  frames: RenderedFrame[];
  fps: number;
  durationMs: number;
  onProgress?: (progress: number) => void;
}): Promise<Blob> {
  const ffmpegInstance = await ensureFFmpeg();
  const outputName = "output.webm";
  const progressHandler = createProgressHandler(opts.onProgress, opts.durationMs);
  const cleanupFiles = [...opts.frames.map((frame) => frame.name), outputName];

  ffmpegInstance.on("progress", progressHandler);

  try {
    await writeFrameSequence(ffmpegInstance, opts.frames);
    await ffmpegInstance.exec([
      "-framerate", String(opts.fps),
      "-start_number", "0",
      "-i", "frame-%06d.png",
      "-c:v", "libvpx-vp9",
      "-pix_fmt", "yuv420p",
      "-crf", "30",
      "-b:v", "0",
      outputName,
    ]);

    const data = await ffmpegInstance.readFile(outputName);
    return toOutputBlob(data, "video/webm");
  } catch (error) {
    throw new Error(`WebM encoding failed: ${error}`);
  } finally {
    await deleteFiles(ffmpegInstance, cleanupFiles);
    ffmpegInstance.off("progress", progressHandler);
  }
}

export async function encodeFrameSequenceToMp4(opts: {
  frames: RenderedFrame[];
  fps: number;
  durationMs: number;
  audioBlob?: Blob;
  onProgress?: (progress: number) => void;
}): Promise<Blob> {
  const ffmpegInstance = await ensureFFmpeg();
  const outputName = "output.mp4";
  const audioName = "audio.wav";
  const cleanupFiles = [...opts.frames.map((frame) => frame.name), outputName];
  const progressHandler = createProgressHandler(opts.onProgress, opts.durationMs);
  const durationSec = (opts.durationMs / 1000).toFixed(3);

  ffmpegInstance.on("progress", progressHandler);

  try {
    await writeFrameSequence(ffmpegInstance, opts.frames);
    if (opts.audioBlob) {
      await ffmpegInstance.writeFile(audioName, await fetchFile(opts.audioBlob));
      cleanupFiles.push(audioName);
    }

    const args = opts.audioBlob
      ? [
          "-framerate", String(opts.fps),
          "-start_number", "0",
          "-i", "frame-%06d.png",
          "-i", audioName,
          "-filter_complex", "[1:a]apad[aout]",
          "-map", "0:v:0",
          "-map", "[aout]",
          "-c:v", "libx264",
          "-preset", "medium",
          "-crf", "18",
          "-pix_fmt", "yuv420p",
          "-c:a", "aac",
          "-b:a", "128k",
          "-t", durationSec,
          outputName,
        ]
      : [
          "-framerate", String(opts.fps),
          "-start_number", "0",
          "-i", "frame-%06d.png",
          "-c:v", "libx264",
          "-preset", "medium",
          "-crf", "18",
          "-pix_fmt", "yuv420p",
          "-an",
          outputName,
        ];

    await ffmpegInstance.exec(args);
    const data = await ffmpegInstance.readFile(outputName);
    return toOutputBlob(data, "video/mp4");
  } catch (error) {
    throw new Error(`MP4 encoding failed: ${error}`);
  } finally {
    await deleteFiles(ffmpegInstance, cleanupFiles);
    ffmpegInstance.off("progress", progressHandler);
  }
}

export async function terminateFFmpeg() {
  if (ffmpeg) {
    await ffmpeg.terminate();
    ffmpeg = null;
  }
}
