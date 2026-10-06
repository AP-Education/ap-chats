import { isNativeShell } from '@ap/shell-sdk';
import { useEffect, useState } from 'react';

export function useBrowserKeyboardHeight(): number {
  const [height, setHeight] = useState(300);

  useEffect(() => {
    if (isNativeShell() || !window.visualViewport) return;
    const viewport = window.visualViewport;
    let timer: ReturnType<typeof setTimeout>;
    const measure = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const measured = Math.round(window.innerHeight - viewport.height);
        if (measured > 80) setHeight(measured);
      }, 120);
    };
    viewport.addEventListener('resize', measure);
    return () => {
      clearTimeout(timer);
      viewport.removeEventListener('resize', measure);
    };
  }, []);

  return height;
}
