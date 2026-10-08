import { mix } from '../../shared/theme/color';
import { type HueId, hues } from '../../shared/theme/palette';
import type { AccentColors, AccentPreset, Appearance } from './types';

function preset(id: HueId, name: string): AccentPreset {
  return { id, name, primary: hues[id].primary, bubble: hues[id].deep };
}

export const accentPresets: readonly AccentPreset[] = [
  preset('teal', 'Бірюзовий'),
  preset('indigo', 'Індиго'),
  preset('violet', 'Фіолетовий'),
  preset('blue', 'Синій'),
  preset('cyan', 'Блакитний'),
  preset('rose', 'Рожевий'),
  preset('amber', 'Помаранчевий'),
  preset('graphite', 'Графіт'),
];

export const defaultAccent = accentPresets[0]!;

export function findAccent(id: string): AccentPreset {
  return accentPresets.find((accent) => accent.id === id) ?? defaultAccent;
}

const PAGE = { light: '#ffffff', dark: '#0c1113' };
const INK = { light: '#000000', dark: '#ffffff' };

// Selected states put text on a tint of the accent: the tint leans towards the page and
// the text away from it, so the pair stays clearly readable whatever the accent.
export function accentColors(accent: AccentPreset, appearance: Appearance): AccentColors {
  const primary = accent.primary[appearance];
  const page = PAGE[appearance];
  const dark = appearance === 'dark';

  return {
    primary,
    primaryBg: mix(primary, page, dark ? 0.74 : 0.86),
    primaryBgHover: mix(primary, page, dark ? 0.66 : 0.8),
    primaryBorder: mix(primary, page, dark ? 0.5 : 0.55),
    primaryBorderHover: mix(primary, page, dark ? 0.4 : 0.45),
    primaryText: dark ? mix(primary, INK.dark, 0.3) : primary,
    primaryTextActive: mix(primary, INK[appearance], dark ? 0.5 : 0.3),
    bubble: accent.bubble,
  };
}
