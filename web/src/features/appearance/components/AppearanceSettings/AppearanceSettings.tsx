import { DesktopIcon, MoonIcon, PaletteIcon, SunIcon } from '@phosphor-icons/react';
import { Modal, Segmented, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { WallpaperGallery } from '@/features/social/wallpaper/components/WallpaperGallery/WallpaperGallery';
import { WallpaperGrainSwitch } from '@/features/social/wallpaper/components/WallpaperGallery/WallpaperGrainSwitch';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { IconButton } from '@/shared/ui/IconButton';

import { useAppearanceActions, useThemeMode } from '../../stores/appearance-store';
import type { ThemeMode } from '../../types';
import { AccentPicker } from './AccentPicker';

const useStyles = createStyles(({ token, css }) => ({
  sections: css`
    display: grid;
    gap: 20px;
    padding-top: 8px;
  `,
  section: css`
    display: grid;
    gap: 10px;
  `,
  label: css`
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
    font-weight: 600;
  `,
  option: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
  `,
}));

const THEME_MODES: { value: ThemeMode; label: string; Icon: typeof SunIcon }[] = [
  { value: 'light', label: 'Світла', Icon: SunIcon },
  { value: 'dark', label: 'Темна', Icon: MoonIcon },
  { value: 'system', label: 'Як у системі', Icon: DesktopIcon },
];

export function AppearanceSettings() {
  const { styles } = useStyles();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const mode = useThemeMode();
  const { chooseMode } = useAppearanceActions();

  return (
    <>
      <Tooltip title="Оформлення">
        <IconButton size={isMobile ? 44 : 36} aria-label="Оформлення" onClick={() => setOpen(true)}>
          <PaletteIcon size={isMobile ? 24 : 20} />
        </IconButton>
      </Tooltip>
      <Modal
        open={open}
        title="Оформлення"
        footer={null}
        width={560}
        destroyOnHidden
        onCancel={() => setOpen(false)}
      >
        <div className={styles.sections}>
          <section className={styles.section}>
            <span className={styles.label}>Тема</span>
            <Segmented
              block
              value={mode}
              onChange={(value) => chooseMode(value as ThemeMode)}
              options={THEME_MODES.map(({ value, label, Icon }) => ({
                value,
                label: (
                  <span className={styles.option}>
                    <Icon size={16} aria-hidden />
                    {label}
                  </span>
                ),
              }))}
            />
          </section>
          <section className={styles.section}>
            <span className={styles.label}>Колір акценту</span>
            <AccentPicker />
          </section>
          <section className={styles.section}>
            <span className={styles.label}>Фон чатів</span>
            <WallpaperGallery />
            <WallpaperGrainSwitch />
          </section>
        </div>
      </Modal>
    </>
  );
}
