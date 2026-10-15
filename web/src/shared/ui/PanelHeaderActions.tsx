import { createStyles } from 'antd-style';
import type { PropsWithChildren } from 'react';

const useStyles = createStyles(({ css }) => ({
  actions: css`
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 4px;
    padding-right: 8px;
  `,
}));

/** The controls at the end of a panel header, so every section's header lines up the same. */
export function PanelHeaderActions({ children }: PropsWithChildren) {
  const { styles } = useStyles();
  return <div className={styles.actions}>{children}</div>;
}
