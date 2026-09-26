import { Skeleton } from 'antd';
import { createStyles } from 'antd-style';

const useStyles = createStyles(({ css }) => ({
  shell: css`
    padding: 12px 20px;
  `,
  section: css`
    margin-bottom: 20px;
  `,
  row: css`
    height: 34px;
    display: flex;
    align-items: center;
    padding-left: 16px;
  `,
}));

export function ChannelsSidebarLoading() {
  const { styles } = useStyles();
  return (
    <div className={styles.shell} role="status" aria-label="Завантажуємо список каналів">
      {[0, 1].map((section) => (
        <div className={styles.section} key={section}>
          <Skeleton.Input active size="small" style={{ width: 112, height: 15 }} />
          {[0, 1, 2].map((row) => (
            <div className={styles.row} key={row}>
              <Skeleton.Input active size="small" style={{ width: 150, height: 20 }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
