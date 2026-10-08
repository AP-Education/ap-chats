import { Switch } from 'antd';
import { createStyles } from 'antd-style';

import { useWallpaperBase } from '../../hooks/useWallpaperBase';
import { useSetWallpaperGrain, useWallpaperGrain } from '../../stores/wallpaper-store';

const useStyles = createStyles(({ token, css }) => ({
  row: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${token.padding}px;
    cursor: pointer;
  `,
  text: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
  `,
  title: css`
    color: ${token.colorText};
    font-size: ${token.fontSizeSM}px;
    font-weight: 500;
  `,
  hint: css`
    color: ${token.colorTextSecondary};
    font-size: 12px;
  `,
}));

export function WallpaperGrainSwitch() {
  const { styles } = useStyles();
  const { appearance } = useWallpaperBase();
  const visible = useWallpaperGrain(appearance);
  const setGrain = useSetWallpaperGrain();

  return (
    <label className={styles.row}>
      <span className={styles.text}>
        <span className={styles.title}>Зернистість</span>
        <span className={styles.hint}>Тонка фактура поверх фону, окремо для кожної теми</span>
      </span>
      <Switch checked={visible} onChange={(checked) => setGrain(appearance, checked)} />
    </label>
  );
}
