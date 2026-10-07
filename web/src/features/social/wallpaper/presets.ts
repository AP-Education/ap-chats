import type { WallpaperPreset } from './types';

// Brand gradients of ap.education and its school, courses and university sites: dark
// surfaces lit by one accent glow, with fine line art instead of illustrations.
const COURSES_ACCENT = ['#0f645b', '#0b958d'] as const;
const UNIVERSITY_ACCENT = ['#002395', '#352ce8'] as const;
const SCHOOL_ACCENT = ['#4b0082', '#924dff'] as const;

export const wallpaperPresets: readonly WallpaperPreset[] = [
  {
    id: 'ap',
    name: 'AP Education',
    tone: 'dark',
    colors: ['#0f645b', '#0a2f2b', '#030807', '#061513'],
    pattern: {
      id: 'network',
      ink: ['#5ff2ea', '#3cc9c2', '#1f8f88', '#2aa8a1'],
      opacity: 0.34,
    },
    accent: COURSES_ACCENT,
    service: '#0b3c35',
  },
  {
    id: 'university',
    name: 'Університет',
    tone: 'dark',
    colors: ['#06124a', '#02040f', '#1d1a8c', '#030a2e'],
    pattern: {
      id: 'university',
      ink: ['#8ea2ff', '#6f7dff', '#a59bff', '#7a8cff'],
      opacity: 0.3,
    },
    accent: UNIVERSITY_ACCENT,
    service: '#0a1550',
  },
  {
    id: 'school',
    name: 'Школа',
    tone: 'dark',
    colors: ['#14051f', '#3a0a66', '#1e0636', '#0b0312'],
    pattern: {
      id: 'school',
      ink: ['#c8a8ff', '#d8b8ff', '#b48cff', '#a87cf5'],
      opacity: 0.28,
    },
    accent: SCHOOL_ACCENT,
    service: '#2a0a4a',
  },
  {
    id: 'space',
    name: 'Космос',
    tone: 'dark',
    colors: ['#1c1150', '#03040c', '#0a1a4a', '#2a0f4f'],
    pattern: {
      id: 'space',
      ink: ['#e3dcff', '#ffffff', '#cfdcff', '#f0d9ff'],
      opacity: 0.5,
    },
    accent: [UNIVERSITY_ACCENT[1], SCHOOL_ACCENT[1]],
    service: '#151040',
  },
  {
    id: 'aurora',
    name: 'Аврора',
    tone: 'dark',
    colors: ['#0f645b', '#05060d', '#1d1a7a', '#300a57'],
    pattern: {
      id: 'stardust',
      ink: ['#bff7f3', '#ffffff', '#c9c6ff', '#e6cfff'],
      opacity: 0.4,
    },
    accent: [COURSES_ACCENT[0], UNIVERSITY_ACCENT[1]],
    service: '#141038',
  },
  {
    id: 'mist',
    name: 'Туман',
    tone: 'light',
    colors: ['#d5ebe8', '#f3f6f8', '#dee4f1', '#e7f1ee'],
    pattern: {
      id: 'network',
      ink: ['#3e8f87', '#7d9aa8', '#5d6fb0', '#4c9a90'],
      opacity: 0.26,
    },
    accent: COURSES_ACCENT,
    service: '#3d6f69',
  },
  {
    id: 'lilac',
    name: 'Бузок',
    tone: 'light',
    colors: ['#e8dffc', '#f7f5fd', '#dfe3fa', '#eee5fb'],
    pattern: {
      id: 'stardust',
      ink: ['#8b5fd6', '#9d8ccf', '#6a72c9', '#9a6fe0'],
      opacity: 0.32,
    },
    accent: SCHOOL_ACCENT,
    service: '#4d3a7a',
  },
  {
    id: 'minimal',
    name: 'Мінімал',
    tone: 'light',
    colors: ['#e8f1ef', '#f7f8f8', '#e7ecf2', '#eef4f1'],
    pattern: null,
    accent: COURSES_ACCENT,
    service: '#53706b',
  },
];

export const defaultWallpaper = wallpaperPresets[0]!;

export function findWallpaper(id: string): WallpaperPreset {
  return wallpaperPresets.find((preset) => preset.id === id) ?? defaultWallpaper;
}
