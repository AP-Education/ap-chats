import { withAlpha } from '@/shared/theme/color';

import type { WallpaperLight } from '../types';

// Soft light needs only a small canvas; CSS scales it up with bilinear filtering, so it
// stays smooth at any size. The height follows the surface's aspect ratio, so rings and
// ribbons keep their geometry instead of stretching with the screen.
const WIDTH = 160;

type Stops = readonly (readonly [offset: number, share: number])[];

// A dense core thinning out gently, like light rather than a disc.
const GLOW: Stops = [
  [0, 1],
  [0.3, 0.72],
  [0.62, 0.28],
  [1, 0],
];

// An empty centre and a bright rim fading both ways: a ring of light.
const RING: Stops = [
  [0, 0],
  [0.46, 0],
  [0.7, 0.62],
  [0.8, 1],
  [0.9, 0.48],
  [1, 0],
];

export function paintLights(
  canvas: HTMLCanvasElement,
  aspectRatio: number,
  base: string,
  lights: readonly WallpaperLight[],
) {
  const context = canvas.getContext('2d');
  if (!context) return;

  const width = WIDTH;
  const height = Math.max(1, Math.round(WIDTH * aspectRatio));
  const unit = Math.max(width, height);
  canvas.width = width;
  canvas.height = height;
  context.fillStyle = base;
  context.fillRect(0, 0, width, height);

  for (const light of lights) {
    const radius = light.radius * unit;
    const paint = context.createRadialGradient(0, 0, 0, 0, 0, radius);
    for (const [offset, share] of light.kind === 'halo' ? RING : GLOW) {
      paint.addColorStop(offset, withAlpha(light.color, light.strength * share));
    }

    context.save();
    context.translate(light.x * width, light.y * height);
    shape(context, light);
    context.fillStyle = paint;
    context.fillRect(-radius, -radius, radius * 2, radius * 2);
    context.restore();
  }
}

function shape(context: CanvasRenderingContext2D, light: WallpaperLight) {
  if (light.kind === 'ribbon') {
    context.rotate(light.angle);
    context.scale(light.stretch, 1);
  }
  if (light.kind === 'halo') {
    context.rotate(light.angle);
    context.scale(1, light.tilt);
  }
}
