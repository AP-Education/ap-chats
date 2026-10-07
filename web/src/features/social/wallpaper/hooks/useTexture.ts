import { useEffect, useReducer, useSyncExternalStore } from 'react';

import { loadTexture, readyTexture } from '../canvas/textures';

// Past 2x the faint lines look the same, while the tile memory keeps growing.
const MAX_PIXEL_RATIO = 2;

export function usePixelRatio() {
  return useSyncExternalStore(subscribeToPixelRatio, readPixelRatio);
}

/** A canvas texture as an image URL, rendered once per name and pixel ratio. */
export function useTexture<Name extends string>(
  name: Name | null,
  render: (name: Name, pixelRatio: number) => HTMLCanvasElement | Promise<HTMLCanvasElement>,
): string | null {
  const pixelRatio = usePixelRatio();
  const key = name && `${name}@${pixelRatio}`;
  const url = key ? readyTexture(key) : undefined;
  const [, refresh] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    if (!name || !key || url) return;

    let active = true;
    void loadTexture(key, () => render(name, pixelRatio)).then(() => {
      if (active) refresh();
    });
    return () => {
      active = false;
    };
  }, [name, key, url, render, pixelRatio]);

  return url ?? null;
}

function readPixelRatio() {
  return Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1);
}

// A resolution query only reports leaving its own ratio, so it is rebuilt after every
// change to keep following browser zoom and moves between displays.
function subscribeToPixelRatio(onChange: () => void) {
  let query = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);

  function handleChange() {
    query.removeEventListener('change', handleChange);
    query = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    query.addEventListener('change', handleChange);
    onChange();
  }

  query.addEventListener('change', handleChange);
  return () => query.removeEventListener('change', handleChange);
}
