export type Appearance = 'light' | 'dark';

/** Mirrors web/src/features/appearance/types.ts: the resolved theme web/ hands over, so
 * the status bar, the area around the page and the native panels follow it. */
export interface ShellPalette {
  appearance: Appearance;
  surface: string;
  primary: string;
  primaryBg: string;
  text: string;
  textSecondary: string;
}
