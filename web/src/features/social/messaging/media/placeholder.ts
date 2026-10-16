import { rgbaToThumbHash, thumbHashToDataURL } from 'thumbhash';

// ThumbHash reads at most 100 pixels a side.
const PLACEHOLDER_SIDE = 100;

export function placeholderBytes(placeholder: string): Uint8Array {
  return Uint8Array.from(atob(placeholder), (char) => char.charCodeAt(0));
}

/** The blurred stand-in a ThumbHash holds, to paint while the image itself loads. */
export function placeholderImage(placeholder: string): string {
  return thumbHashToDataURL(placeholderBytes(placeholder));
}

/** Loaded so its pixels can be read: the GIF services' CDNs allow it, data URLs always do. */
export function loadReadableImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Image did not load: ${src}`));
    image.src = src;
  });
}

/** A loaded image's ThumbHash, base64, the way the server keeps one for photos. */
export function readPlaceholder(image: HTMLImageElement): string {
  const scale = Math.min(1, PLACEHOLDER_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is unavailable');
  context.drawImage(image, 0, 0, width, height);

  const hash = rgbaToThumbHash(width, height, context.getImageData(0, 0, width, height).data);
  return btoa(String.fromCharCode(...hash));
}
