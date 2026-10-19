import { Skeleton } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

const useStyles = createStyles(({ token, css }) => ({
  row: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${token.paddingSM}px 0;
    border-bottom: 1px solid ${token.colorSplit};
  `,
}));

export function ChannelCategoryListSkeleton() {
  const { t } = useTranslation('communities');
  const { styles } = useStyles();

  return (
    <div aria-label={t(($) => $.categories.loading)} role="status">
      {[136, 96, 168].map((width) => (
        <div key={width} className={styles.row}>
          <Skeleton.Input active size="small" style={{ width, minWidth: 0, height: 14 }} />
          <Skeleton.Avatar active size={24} shape="square" />
        </div>
      ))}
    </div>
  );
}
