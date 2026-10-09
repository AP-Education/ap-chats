import { Skeleton } from 'antd';
import { createStyles } from 'antd-style';

const CATEGORIES = 9;
const ROWS = 4;
const COLUMNS = 8;

const useStyles = createStyles(({ css }) => ({
  root: css`
    display: flex;
    flex-direction: column;
    flex: 1;
    gap: 6px;
    min-height: 0;
    overflow: hidden;
  `,
  nav: css`
    display: flex;
    gap: 2px;
  `,
  navItem: css`
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
  `,
  grid: css`
    display: grid;
    grid-template-columns: repeat(${COLUMNS}, 1fr);
    grid-auto-rows: 44px;
    place-items: center;
  `,
}));

/** The emoji tab's frame while its data set downloads. */
export function EmojiTabSkeleton() {
  const { styles } = useStyles();

  return (
    <div className={styles.root} aria-label="Завантажуємо емодзі" role="status">
      <div className={styles.nav}>
        {Array.from({ length: CATEGORIES }, (_, index) => (
          <span key={index} className={styles.navItem}>
            <Skeleton.Avatar active size={18} shape="square" />
          </span>
        ))}
      </div>
      <div className={styles.grid}>
        {Array.from({ length: ROWS * COLUMNS }, (_, index) => (
          <Skeleton.Avatar key={index} active size={28} shape="circle" />
        ))}
      </div>
    </div>
  );
}
