import type { GlobalToken } from 'antd';

import { surfaceAppearance } from '../../../theme/color';

// The theme's own preset palettes, in the order names were always hashed into, so
// everyone keeps their hue; yellow gave way to cyan, which stays readable on light.
export const AVATAR_PRESETS = [
  'red',
  'orange',
  'cyan',
  'green',
  'blue',
  'purple',
  'magenta',
] as const;

// Names sit on bubbles rather than on their own tint, so dark takes the next, brighter shade.
export const NAME_SHADE = { light: 8, dark: 9 } as const;

export interface AvatarColors {
  /** A light two-step gradient: the palette's palest shades, deep tints on dark. */
  from: string;
  to: string;
  initials: string;
  name: string;
}

/** Deterministic per name; the shades follow whichever algorithm the token comes from. */
export function avatarColors(name: string, token: GlobalToken): AvatarColors {
  const preset = AVATAR_PRESETS[simpleHash(name) % AVATAR_PRESETS.length]!;
  const nameShade = NAME_SHADE[surfaceAppearance(token.colorBgContainer)];

  return {
    from: token[`${preset}1`],
    to: token[`${preset}2`],
    initials: token[`${preset}8`],
    name: token[`${preset}${nameShade}`],
  };
}

function simpleHash(str?: string): number {
  let hash = 0;
  if (!str) return hash;

  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
