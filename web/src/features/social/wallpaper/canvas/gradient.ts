import type { WallpaperPalette } from '../types';
import { parseHex } from './color';

// A low-frequency field needs only a few dozen pixels; CSS scales the canvas up with
// bilinear filtering, so the gradient stays smooth at any size for almost no cost.
const RESOLUTION = 64;

const ANCHORS = [
  { x: 0.84, y: 0.12 },
  { x: 0.22, y: 0.3 },
  { x: 0.3, y: 0.9 },
  { x: 0.78, y: 0.68 },
];

const TWIST = 2.4;
const FALLOFF = 3;

export function paintGradient(canvas: HTMLCanvasElement, palette: WallpaperPalette) {
  const context = canvas.getContext('2d');
  if (!context) return;

  canvas.width = RESOLUTION;
  canvas.height = RESOLUTION;
  const colors = palette.map(parseHex);
  const image = context.createImageData(RESOLUTION, RESOLUTION);

  for (let row = 0; row < RESOLUTION; row++) {
    for (let column = 0; column < RESOLUTION; column++) {
      const point = twist((column + 0.5) / RESOLUTION, (row + 0.5) / RESOLUTION);
      let red = 0;
      let green = 0;
      let blue = 0;
      let total = 0;

      ANCHORS.forEach((anchor, index) => {
        const distance = Math.hypot(point.x - anchor.x, point.y - anchor.y);
        const weight = 1 / (distance ** FALLOFF + 1e-4);
        const color = colors[index]!;
        red += color.r * weight;
        green += color.g * weight;
        blue += color.b * weight;
        total += weight;
      });

      const offset = (row * RESOLUTION + column) * 4;
      image.data[offset] = red / total;
      image.data[offset + 1] = green / total;
      image.data[offset + 2] = blue / total;
      image.data[offset + 3] = 255;
    }
  }

  context.putImageData(image, 0, 0);
}

// Rotating each point around the centre, more towards the edges, bends the straight
// blends between anchors into the soft swirl of a mesh gradient.
function twist(x: number, y: number) {
  const dx = x - 0.5;
  const dy = y - 0.5;
  const angle = TWIST * (dx * dx + dy * dy);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return { x: 0.5 + dx * cos - dy * sin, y: 0.5 + dx * sin + dy * cos };
}
