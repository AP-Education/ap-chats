export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function parseHex(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

export function toHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
}

export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** `amount` of `to` blended into `from`. */
export function mix(from: string, to: string, amount: number): string {
  const a = parseHex(from);
  const b = parseHex(to);
  return toHex({
    r: a.r + (b.r - a.r) * amount,
    g: a.g + (b.g - a.g) * amount,
    b: a.b + (b.b - a.b) * amount,
  });
}

export function average(colors: readonly string[]): string {
  const channels = colors.map(parseHex);
  const sum = (pick: (color: Rgb) => number) =>
    channels.reduce((total, color) => total + pick(color), 0) / channels.length;
  return toHex({ r: sum(({ r }) => r), g: sum(({ g }) => g), b: sum(({ b }) => b) });
}

/** Relative luminance, 0 for black and 1 for white. */
export function luminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  const linear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG contrast ratio between two colours, from 1 to 21. */
export function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter! + 0.05) / (darker! + 0.05);
}

/** Whether a surface colour belongs to a light or a dark theme. */
export function surfaceAppearance(surface: string): 'light' | 'dark' {
  return luminance(surface) < 0.4 ? 'dark' : 'light';
}
