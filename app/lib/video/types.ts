export type ExportFormat = "mp4" | "webm" | "gif";

export function getEffectiveExportFps(format: ExportFormat, requestedFps: number): number {
  if (format === "gif" && requestedFps === 60) {
    return 50;
  }

  return requestedFps;
}
