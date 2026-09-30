import { Skeleton } from 'antd';
import { createStyles } from 'antd-style';

const useStyles = createStyles(({ token, css }) => ({
  group: css`
    margin-top: 20px;
    padding: 0 0 8px;
    color: ${token.colorTextTertiary};
  `,
  row: css`
    display: flex;
    align-items: center;
    gap: 12px;
    height: 64px;
    padding: 10px 0;
  `,
  body: css`
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 6px;
  `,
  nameLine: css`
    display: flex;
    align-items: baseline;
    gap: 8px;
  `,
}));

export function CallHistoryListSkeleton() {
  const { styles } = useStyles();

  return (
    <div aria-label="Завантажуємо дзвінки" role="status">
      <div className={styles.group}>
        <Skeleton.Input active size="small" style={{ width: 72, height: 12 }} />
      </div>
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className={styles.row}>
          <Skeleton.Avatar active size={40} shape="circle" />
          <span className={styles.body}>
            <span className={styles.nameLine}>
              <Skeleton.Input active size="small" style={{ width: 140, height: 14 }} />
              <Skeleton.Input active size="small" style={{ width: 32, height: 10 }} />
            </span>
            <Skeleton.Input active size="small" style={{ width: 100, height: 12 }} />
          </span>
          <Skeleton.Avatar active size={44} shape="circle" />
        </div>
      ))}
    </div>
  );
}
