import { ArrowClockwiseIcon, ImageIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';

const useStyles = createStyles(({ token, css }) => ({
  status: css`
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: ${token.colorTextSecondary};
    pointer-events: none;
  `,
}));

/** What a photo shows before it is there: that it is coming, or that it failed and can retry. */
export function ImageStatus({ broken }: { broken: boolean }) {
  const { styles } = useStyles();
  return (
    <span className={styles.status} aria-hidden>
      {broken ? <ArrowClockwiseIcon size={28} /> : <ImageIcon size={28} />}
    </span>
  );
}
