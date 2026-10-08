const pendingTextures = new Map<string, Promise<string>>();
const readyTextures = new Map<string, string>();

export function readyTexture(key: string) {
  return readyTextures.get(key);
}

// Each texture is rendered once per key and shared by every chat and preview.
export function loadTexture(
  key: string,
  render: () => HTMLCanvasElement | Promise<HTMLCanvasElement>,
): Promise<string> {
  const pending = pendingTextures.get(key);
  if (pending) return pending;

  const texture = Promise.resolve()
    .then(render)
    .then(toObjectUrl)
    .then((url) => {
      readyTextures.set(key, url);
      return url;
    });
  texture.catch(() => pendingTextures.delete(key));
  pendingTextures.set(key, texture);
  return texture;
}

function toObjectUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(URL.createObjectURL(blob));
      else reject(new Error('Wallpaper texture could not be encoded'));
    });
  });
}
