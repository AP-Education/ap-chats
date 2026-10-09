import { Skeleton } from 'antd';
import { createStyles } from 'antd-style';

const useStyles = createStyles(({ css }) => ({
  row: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 34px;
    padding: 4px 8px;
  `,
}));

export function ChannelNotificationsMenuSkeleton() {
  const { styles } = useStyles();

  return (
    <div aria-label="Завантажуємо сповіщення каналу" role="status">
      {[112, 136, 88, 120].map((width) => (
        <div key={width} className={styles.row}>
          <Skeleton.Input active size="small" style={{ width, minWidth: 0, height: 12 }} />
          <Skeleton.Avatar active size={16} shape="circle" />
        </div>
      ))}
    </div>
  );
}
