/** What the person picked; `system` follows the device setting. */
export type ThemeMode = 'light' | 'dark' | 'system';

/** What the app actually renders. */
export type Appearance = 'light' | 'dark';

export interface AccentPreset {
  id: string;
  name: string;
  /** Mid tones on both bases: antd sets white text on the primary colour. */
  primary: Record<Appearance, string>;
  /** Own bubble gradient: the deeper tone at the tail, a close lighter one opposite. */
  bubble: readonly [string, string];
}

/** Everything the theme needs from an accent for one appearance. */
export interface AccentColors {
  primary: string;
  primaryBg: string;
  primaryBgHover: string;
  primaryBorder: string;
  primaryBorderHover: string;
  primaryText: string;
  primaryTextActive: string;
  bubble: readonly [string, string];
}

/** What the native shell paints around the WebView: the status bar area and its own
 * panels. Mirrored in mobile/src/features/appearance/types. */
export interface ShellPalette {
  appearance: Appearance;
  surface: string;
  primary: string;
  primaryBg: string;
  text: string;
  textSecondary: string;
}
