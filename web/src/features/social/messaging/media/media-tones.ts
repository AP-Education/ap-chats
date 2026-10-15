import { thumbHashToRGBA } from 'thumbhash';

import { placeholderBytes } from './placeholder';

export type Rgb = [red: number, green: number, blue: number];

interface Pixels {
  w: number;
  h: number;
  rgba: ArrayLike<number>;
}

/** A part of an image in fractions of its size, so it reads the same at any resolution. */
interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Fills for the badges on a photo's or GIF's corners, in its colours, dark enough for white text. */
export interface MediaTones {
  topLeft: string;
  bottomRight: string;
}

// White text keeps a 4.5:1 contrast on any fill no lighter than this.
const BADGE_MAX_LUMINANCE = 0.18;
const BADGE_ALPHA = 0.85;

export function regionAverage({ w, h, rgba }: Pixels, region: Region): Rgb {
  const left = Math.floor(region.x * w);
  const top = Math.floor(region.y * h);
  const right = Math.max(left + 1, Math.ceil((region.x + region.width) * w));
  const bottom = Math.max(top + 1, Math.ceil((region.y + region.height) * h));
  const sum: Rgb = [0, 0, 0];
  let count = 0;

  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      const index = (y * w + x) * 4;
      sum[0] += rgba[index]!;
      sum[1] += rgba[index + 1]!;
      sum[2] += rgba[index + 2]!;
      count++;
    }
  }

  return sum.map((channel) => Math.round(channel / count)) as Rgb;
}

/** WCAG relative luminance. */
export function luminance(rgb: Rgb): number {
  const [red, green, blue] = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** The corner's own colour, darkened only as far as white text on it needs. */
export function badgeTone(rgb: Rgb): Rgb {
  let tone = rgb;
  while (luminance(tone) > BADGE_MAX_LUMINANCE) {
    tone = tone.map((channel) => Math.round(channel * 0.9)) as Rgb;
  }
  return tone;
}

function css([red, green, blue]: Rgb, alpha = 1): string {
  return `rgb(${red} ${green} ${blue} / ${alpha})`;
}

/** Read from the image's ThumbHash, so the badges are tinted before the image itself loads. */
export function mediaTones(placeholder: string): MediaTones {
  const pixels = thumbHashToRGBA(placeholderBytes(placeholder));
  const corner = (x: number, y: number) =>
    css(badgeTone(regionAverage(pixels, { x, y, width: 0.35, height: 0.25 })), BADGE_ALPHA);

  return { topLeft: corner(0, 0), bottomRight: corner(0.65, 0.75) };
}
