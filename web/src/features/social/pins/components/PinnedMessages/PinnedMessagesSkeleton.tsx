import { Skeleton } from 'antd';
import { createStyles } from 'antd-style';

const useStyles = createStyles(({ css }) => ({
  row: css`
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 4px;
    padding: 8px 10px;
  `,
}));

export function PinnedMessagesSkeleton() {
  const { styles } = useStyles();

  return (
    <div aria-label="Завантажуємо закріплене" role="status">
      {[96, 72, 112].map((width) => (
        <div key={width} className={styles.row}>
          <Skeleton.Input active size="small" style={{ width, minWidth: 0, height: 12 }} />
          <Skeleton.Input active size="small" style={{ width: 220, minWidth: 0, height: 14 }} />
        </div>
      ))}
    </div>
  );
}
