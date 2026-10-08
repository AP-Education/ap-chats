import { type RefObject, useLayoutEffect, useState } from 'react';

// Rounded to coarse steps, so the light is repainted when the shape of the surface
// changes, not on every pixel of a resize.
export function useAspectRatio(ref: RefObject<HTMLElement | null>) {
  const [aspectRatio, setAspectRatio] = useState(1);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    function measure() {
      const { width, height } = node!.getBoundingClientRect();
      if (width && height) setAspectRatio(Math.round((height / width) * 20) / 20);
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  return aspectRatio;
}

// Position in the page from offsetLeft/offsetTop, which ignore transforms, so a panel
// sliding in on mobile carries its piece of the wallpaper without re-aligning it.
export function useLayoutOffset(ref: RefObject<HTMLElement | null>) {
  const [offset, setOffset] = useState({ left: 0, top: 0 });

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    function measure() {
      let left = 0;
      let top = 0;
      let element: Element | null = node;
      while (element instanceof HTMLElement) {
        left += element.offsetLeft;
        top += element.offsetTop;
        element = element.offsetParent;
      }
      setOffset((current) =>
        current.left === left && current.top === top ? current : { left, top },
      );
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [ref]);

  return offset;
}
