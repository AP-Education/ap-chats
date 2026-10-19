import type { Translation } from '../../translation';
import type { wallpaper as source } from '../uk/wallpaper';

export const wallpaper = {
  chatBackground: 'Chat background',
  grain: {
    title: 'Grain',
    hint: 'A fine texture over the background, set separately for each theme',
  },
  presets: {
    ap: 'AP Education',
    university: 'University',
    school: 'School',
    space: 'Space',
    aurora: 'Aurora',
    innovation: 'Innovation',
    minimal: 'Minimal',
    none: 'No background',
  },
} satisfies Translation<typeof source>;
