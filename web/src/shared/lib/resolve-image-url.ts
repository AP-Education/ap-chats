const BASE_URL = import.meta.env.VITE_IMAGES_URL;

/** Resolves a storage key into a fetchable URL; absolute http(s) and blob URLs pass through. */
export function resolveImageUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
    return path;
  }
  return `${BASE_URL}/${path}`;
}
