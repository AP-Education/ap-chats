import { createStyles } from 'antd-style';

import { WallpaperGallery } from './WallpaperGallery/WallpaperGallery';
import { WallpaperGrainSwitch } from './WallpaperGallery/WallpaperGrainSwitch';

const useStyles = createStyles(({ token, css }) => ({
  section: css`
    display: grid;
    gap: 10px;
  `,
  label: css`
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
    font-weight: 600;
  `,
}));

/** Chats' section in the shell's appearance settings, in the same shape as the shell's own. */
export function WallpaperSettings() {
  const { styles } = useStyles();

  return (
    <section className={styles.section}>
      <span className={styles.label}>Фон чатів</span>
      <WallpaperGallery />
      <WallpaperGrainSwitch />
    </section>
  );
}
