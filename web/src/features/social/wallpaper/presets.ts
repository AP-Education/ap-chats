import type { WallpaperPreset } from './types';

// Brand colours of ap.education and its school, courses and university sites.
const TEAL = '#0b958d';
const CYAN = '#09c6cc';
const BLUE = '#3b82f6';
const NAVY = '#002395';
const INDIGO = '#352ce8';
const PURPLE = '#4b0082';
const VIOLET = '#924dff';
const ORCHID = '#d946ef';

// Each composition is a few light shapes: a halo for an orbit or eclipse, ribbons for
// aurora streaks and beams, glows to soften the rest. Angles are in radians.
export const wallpaperPresets: readonly WallpaperPreset[] = [
  {
    id: 'ap',
    name: 'AP Education',
    lights: [
      { kind: 'glow', x: 0.94, y: 0.02, radius: 0.42, color: CYAN, strength: 0.55 },
      {
        kind: 'ribbon',
        x: 0.4,
        y: 0.52,
        radius: 0.16,
        stretch: 4,
        angle: -0.55,
        color: TEAL,
        strength: 0.34,
      },
      {
        kind: 'halo',
        x: 0.06,
        y: 1,
        radius: 0.46,
        tilt: 0.55,
        angle: -0.3,
        color: INDIGO,
        strength: 0.29,
      },
      { kind: 'glow', x: 0.72, y: 0.92, radius: 0.18, color: CYAN, strength: 0.24 },
    ],
    pattern: 'courses',
    accent: ['#0b6a62', '#0f857c'],
  },
  {
    id: 'university',
    name: 'Університет',
    lights: [
      {
        kind: 'ribbon',
        x: 0.14,
        y: 0.08,
        radius: 0.14,
        stretch: 5,
        angle: 0.6,
        color: BLUE,
        strength: 0.42,
      },
      {
        kind: 'ribbon',
        x: 0.5,
        y: 0.32,
        radius: 0.1,
        stretch: 5,
        angle: 0.6,
        color: INDIGO,
        strength: 0.28,
      },
      {
        kind: 'halo',
        x: 0.96,
        y: 0.86,
        radius: 0.4,
        tilt: 0.5,
        angle: 0.4,
        color: VIOLET,
        strength: 0.28,
      },
      { kind: 'glow', x: 0.08, y: 0.96, radius: 0.34, color: NAVY, strength: 0.2 },
    ],
    pattern: 'university',
    accent: ['#2a35c9', '#4352e2'],
  },
  {
    id: 'school',
    name: 'Школа',
    lights: [
      {
        kind: 'halo',
        x: 0.8,
        y: 0.16,
        radius: 0.36,
        tilt: 0.62,
        angle: -0.35,
        color: VIOLET,
        strength: 0.32,
      },
      {
        kind: 'ribbon',
        x: 0.3,
        y: 0.72,
        radius: 0.16,
        stretch: 4.5,
        angle: -0.5,
        color: ORCHID,
        strength: 0.32,
      },
      { kind: 'glow', x: 0.04, y: 0.34, radius: 0.3, color: PURPLE, strength: 0.18 },
      { kind: 'glow', x: 0.92, y: 0.96, radius: 0.3, color: VIOLET, strength: 0.28 },
    ],
    pattern: 'school',
    accent: ['#6229c4', '#7f45e6'],
  },
  {
    id: 'space',
    name: 'Космос',
    lights: [
      {
        kind: 'halo',
        x: 0.5,
        y: 0,
        radius: 0.56,
        tilt: 0.34,
        angle: 0,
        color: INDIGO,
        strength: 0.3,
      },
      {
        kind: 'halo',
        x: 0.5,
        y: 0,
        radius: 0.38,
        tilt: 0.34,
        angle: 0,
        color: VIOLET,
        strength: 0.2,
      },
      { kind: 'glow', x: 0.5, y: -0.04, radius: 0.24, color: CYAN, strength: 0.42 },
      {
        kind: 'ribbon',
        x: 0.2,
        y: 0.86,
        radius: 0.13,
        stretch: 5,
        angle: -0.25,
        color: VIOLET,
        strength: 0.28,
      },
    ],
    pattern: 'space',
    accent: ['#3a2fcc', '#5444e4'],
  },
  {
    id: 'aurora',
    name: 'Аврора',
    lights: [
      {
        kind: 'ribbon',
        x: 0.3,
        y: 0.24,
        radius: 0.2,
        stretch: 4,
        angle: -0.35,
        color: CYAN,
        strength: 0.46,
      },
      {
        kind: 'ribbon',
        x: 0.62,
        y: 0.5,
        radius: 0.16,
        stretch: 4.5,
        angle: -0.42,
        color: INDIGO,
        strength: 0.34,
      },
      {
        kind: 'ribbon',
        x: 0.42,
        y: 0.8,
        radius: 0.15,
        stretch: 4,
        angle: -0.3,
        color: VIOLET,
        strength: 0.34,
      },
      { kind: 'glow', x: 1, y: 0, radius: 0.3, color: TEAL, strength: 0.28 },
    ],
    pattern: 'stardust',
    accent: ['#1b6f96', '#2f86b8'],
  },
  {
    id: 'innovation',
    name: 'Інновації',
    lights: [
      {
        kind: 'ribbon',
        x: 0,
        y: 1,
        radius: 0.13,
        stretch: 6,
        angle: -0.7,
        color: CYAN,
        strength: 0.42,
      },
      {
        kind: 'ribbon',
        x: 0.16,
        y: 1,
        radius: 0.09,
        stretch: 6,
        angle: -0.92,
        color: INDIGO,
        strength: 0.32,
      },
      {
        kind: 'halo',
        x: 0.86,
        y: 0.2,
        radius: 0.3,
        tilt: 0.45,
        angle: 0.5,
        color: VIOLET,
        strength: 0.27,
      },
      { kind: 'glow', x: 0.9, y: 0.14, radius: 0.18, color: CYAN, strength: 0.3 },
    ],
    pattern: 'network',
    accent: ['#1f4bc0', '#3866dc'],
  },
  {
    id: 'minimal',
    name: 'Мінімал',
    lights: [
      { kind: 'glow', x: 0.9, y: 0, radius: 0.6, color: CYAN, strength: 0.34 },
      { kind: 'glow', x: 0.1, y: 1, radius: 0.6, color: INDIGO, strength: 0.22 },
    ],
    pattern: null,
    accent: ['#0b6a62', '#0f857c'],
  },
];

export const defaultWallpaper = wallpaperPresets[0]!;

export function findWallpaper(id: string): WallpaperPreset {
  return wallpaperPresets.find((preset) => preset.id === id) ?? defaultWallpaper;
}
