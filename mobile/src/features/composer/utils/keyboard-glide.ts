/** Until this keyboard has been watched once: close to the iOS keyboard's own spring. */
export const DEFAULT_GLIDE_EASING = 'cubic-bezier(0.38, 0.7, 0.125, 1)';

/**
 * The keyboard's own motion as a CSS easing, built from the heights it reported frame by
 * frame, so the page follows this device and this keyboard rather than a guessed curve.
 * Null when the samples don't describe one rise to the final height.
 */
export function glideEasing(heights: number[], finalHeight: number): string | null {
  if (finalHeight <= 0 || heights.length < 4) return null;

  const progress = heights.map((height) => Math.min(1, Math.max(0, height / finalHeight)));
  if (progress.some((value, index) => index > 0 && value < progress[index - 1]! - 0.02))
    return null;

  return `linear(0, ${progress.map((value) => value.toFixed(3)).join(', ')}, 1)`;
}
