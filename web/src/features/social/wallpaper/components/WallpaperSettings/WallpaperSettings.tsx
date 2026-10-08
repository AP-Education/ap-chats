import { PaletteIcon } from '@phosphor-icons/react';
import { Modal, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { IconButton } from '@/shared/ui/IconButton';

import { useWallpaperBase } from '../../hooks/useWallpaperBase';
import { wallpaperPresets } from '../../presets';
import { useChatWallpaper, useChooseWallpaper } from '../../stores/wallpaper-store';
import { WallpaperPresetCard } from './WallpaperPresetCard';

const useStyles = createStyles(({ css }) => ({
  gallery: css`
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px 12px;
    padding-top: 8px;
  `,
}));

export function WallpaperSettings() {
  const { styles } = useStyles();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const current = useChatWallpaper();
  const choose = useChooseWallpaper();
  const base = useWallpaperBase();

  return (
    <>
      <Tooltip title="Фон чатів">
        <IconButton size={isMobile ? 44 : 36} aria-label="Фон чатів" onClick={() => setOpen(true)}>
          <PaletteIcon size={isMobile ? 24 : 20} />
        </IconButton>
      </Tooltip>
      <Modal
        open={open}
        title="Фон чатів"
        footer={null}
        width={560}
        destroyOnHidden
        onCancel={() => setOpen(false)}
      >
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
      </Modal>
    </>
  );
}
