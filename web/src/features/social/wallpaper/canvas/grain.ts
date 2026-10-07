import { createRandom } from './scatter';

/** Side of the grain tile in device pixels: it is shown 1:1, never scaled. */
export const GRAIN_TILE_PIXELS = 192;

// Fine light and dark noise breaks the 8-bit banding that smooth dark gradients show.
export function renderGrain(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = GRAIN_TILE_PIXELS;
  canvas.height = GRAIN_TILE_PIXELS;
  const context = canvas.getContext('2d')!;
  const image = context.createImageData(GRAIN_TILE_PIXELS, GRAIN_TILE_PIXELS);
  const random = createRandom(7);

  for (let offset = 0; offset < image.data.length; offset += 4) {
    const shade = random() < 0.5 ? 0 : 255;
    image.data[offset] = shade;
    image.data[offset + 1] = shade;
    image.data[offset + 2] = shade;
    image.data[offset + 3] = random() * 28;
  }

  context.putImageData(image, 0, 0);
  return canvas;
}
