import { LoadingIcon } from '@ap-education/ui';
import { createStyles } from 'antd-style';

const useStyles = createStyles(({ css }) => ({
  wait: css`
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    color: rgba(255, 255, 255, 0.72);
  `,
}));

export function LoadingSlide() {
  const { styles } = useStyles();

  return (
    <div className={styles.wait} role="status" aria-label="Завантажуємо історію">
      <LoadingIcon size={32} />
    </div>
  );
}
