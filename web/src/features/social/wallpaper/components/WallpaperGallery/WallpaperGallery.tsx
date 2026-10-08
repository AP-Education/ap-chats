import { createStyles } from 'antd-style';

import { useWallpaperBase } from '../../hooks/useWallpaperBase';
import { wallpaperPresets } from '../../presets';
import { useChatWallpaper, useChooseWallpaper } from '../../stores/wallpaper-store';
import { WallpaperPresetCard } from './WallpaperPresetCard';

const useStyles = createStyles(({ css }) => ({
  gallery: css`
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px 12px;
  `,
}));

export function WallpaperGallery() {
  const { styles } = useStyles();
  const current = useChatWallpaper();
  const choose = useChooseWallpaper();
  const base = useWallpaperBase();

  return (
    <div className={styles.gallery} role="radiogroup" aria-label="Фон чатів">
      {wallpaperPresets.map((preset) => (
        <WallpaperPresetCard
          key={preset.id}
          preset={preset}
          base={base}
          selected={preset.id === current.id}
          onSelect={() => choose(preset.id)}
        />
      ))}
    </div>
  );
}
