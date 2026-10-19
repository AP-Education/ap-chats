import { Skeleton, theme } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

const useStyles = createStyles(({ css }) => ({
  grid: css`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  `,
}));

export function GifGridSkeleton() {
  const { styles } = useStyles();
  const { t } = useTranslation('messaging');
  const { token } = theme.useToken();
  const tile = {
    root: { width: '100%' },
    content: {
      width: '100%',
      height: 'auto',
      aspectRatio: '1',
      borderRadius: token.borderRadius,
    },
  };

  return (
    <div className={styles.grid} aria-label={t(($) => $.picker.gifSearching)} role="status">
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <Skeleton.Node key={index} active styles={tile} />
      ))}
    </div>
  );
}
