import { useWallpaperBase } from '../hooks/useWallpaperBase';
import { useChatWallpaper } from '../stores/wallpaper-store';
import { ViewportFrame } from './ViewportFrame';
import { GrainLayer, LightLayer } from './WallpaperLayers';

/**
 * The wallpaper's light behind the whole shell while Chats is open, so every panel takes a
 * translucent tint of it. The line art stays in the conversation, over the same light.
 */
export function ChatBackdrop() {
  const preset = useChatWallpaper();
  const base = useWallpaperBase();

  return (
    <ViewportFrame>
      <LightLayer preset={preset} base={base} />
      <GrainLayer appearance={base.appearance} />
    </ViewportFrame>
  );
}
