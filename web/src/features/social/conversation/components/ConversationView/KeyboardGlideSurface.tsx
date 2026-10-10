import type { HTMLAttributes, RefObject } from 'react';

import { useKeyboardGlide } from '@/features/social/messaging/hooks/useKeyboardGlide';
import { ChatWallpaperSurface } from '@/features/social/wallpaper/components/ChatWallpaperSurface';

interface KeyboardGlideSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  surfaceRef: RefObject<HTMLDivElement | null>;
}

/** Owns the glide, so a keyboard move re-renders this surface alone and not the conversation in it. */
export function KeyboardGlideSurface({ surfaceRef, children, ...rest }: KeyboardGlideSurfaceProps) {
  const glide = useKeyboardGlide(surfaceRef);

  return (
    <ChatWallpaperSurface ref={surfaceRef} {...rest} {...glide}>
      {children}
    </ChatWallpaperSurface>
  );
}
