export interface MediaSize {
  width: number;
  height: number;
}

/** The widest and tallest a photo or GIF shows in a bubble, as Telegram sizes its media. */
export const MEDIA_MAX_SIDE = 420;

/** Scaled down into the media box, never up, keeping its proportions. */
export function fitMedia({ width, height }: MediaSize, maxSide = MEDIA_MAX_SIDE): MediaSize {
  const scale = Math.min(maxSide / width, maxSide / height, 1);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}
