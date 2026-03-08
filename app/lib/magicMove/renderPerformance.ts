export function getPreviewPixelRatio(
  hasBackground: boolean,
  devicePixelRatio = 1,
): number {
  const safeDpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0
    ? devicePixelRatio
    : 1;

  return hasBackground
    ? Math.min(safeDpr, 1.5)
    : Math.min(safeDpr, 2);
}
