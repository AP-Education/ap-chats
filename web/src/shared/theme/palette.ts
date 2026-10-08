/** One brand hue, in the tones every coloured surface draws from. */
export interface Hue {
  /** Mid tones per base: white text stays readable on the primary colour. */
  primary: { light: string; dark: string };
  /** A close pair deep enough for white text: the own-bubble gradient. */
  deep: readonly [deeper: string, lighter: string];
}

// The single palette behind accent presets and own bubbles,
// so the accent and the bubbles it tints always come from the same family.
export const hues = {
  teal: { primary: { light: '#0c7d77', dark: '#13958c' }, deep: ['#0b6a62', '#0e7d75'] },
  indigo: { primary: { light: '#352ce8', dark: '#6c63ff' }, deep: ['#2a35c9', '#4352e2'] },
  violet: { primary: { light: '#7a3fe0', dark: '#8d5cf0' }, deep: ['#6229c4', '#7f45e6'] },
  blue: { primary: { light: '#2563eb', dark: '#3b78f0' }, deep: ['#1f4fc4', '#3866dc'] },
  cyan: { primary: { light: '#0e7f9c', dark: '#1592b0' }, deep: ['#0b6f8a', '#10788f'] },
  rose: { primary: { light: '#d0236f', dark: '#dc3a7d' }, deep: ['#b81d63', '#c42c71'] },
  amber: { primary: { light: '#c84f0c', dark: '#e0621a' }, deep: ['#b9420a', '#c4500f'] },
  graphite: { primary: { light: '#475569', dark: '#64748b' }, deep: ['#3a4555', '#4c5a6e'] },
} as const satisfies Record<string, Hue>;

export type HueId = keyof typeof hues;
