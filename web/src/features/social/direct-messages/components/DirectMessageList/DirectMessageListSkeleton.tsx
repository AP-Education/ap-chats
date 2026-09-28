import { Skeleton } from 'antd';
import { createStyles } from 'antd-style';

const useStyles = createStyles(({ css }) => ({
  row: css`
    display: flex;
    align-items: center;
    gap: 10px;
    height: 63px;
    padding: 9px 12px;
  `,
  body: css`
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 6px;
  `,
}));

export function DirectMessageListSkeleton() {
  const { styles } = useStyles();

  return (
    <div aria-label="Завантажуємо розмови" role="status">
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className={styles.row}>
          <Skeleton.Avatar active size={36} shape="circle" />
          <span className={styles.body}>
            <Skeleton.Input active size="small" style={{ width: 112, height: 14 }} />
            <Skeleton.Input active size="small" style={{ width: 176, height: 12 }} />
          </span>
        </div>
      ))}
    </div>
  );
}
