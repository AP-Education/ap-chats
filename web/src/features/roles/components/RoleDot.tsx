import { createStyles } from 'antd-style';

const useStyles = createStyles(({ token, css }) => ({
  dot: css`
    flex-shrink: 0;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${token.colorTextQuaternary};
  `,
}));

export function RoleDot({ color }: { color: string | null }) {
  const { styles } = useStyles();
  return (
    <span className={styles.dot} style={color ? { background: color } : undefined} aria-hidden />
  );
}
