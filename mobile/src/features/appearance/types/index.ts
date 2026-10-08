export type Appearance = 'light' | 'dark';

/** Mirrors NativePalette in ap-app's host (features/appearance): the resolved theme the
 * shell hands over, so the status bar, the area around the page and the native panels follow it. */
export interface ShellPalette {
  appearance: Appearance;
  surface: string;
  primary: string;
  primaryBg: string;
  text: string;
  textSecondary: string;
}
