import { createStyles } from 'antd-style';

import { PrincipalIcon } from './PrincipalIcon';
import type { PrincipalDetails } from './usePrincipalDirectory';

const useStyles = createStyles(({ css }) => ({
  label: css`
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  `,
  name: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
}));

export function PrincipalLabel({ details }: { details: PrincipalDetails }) {
  const { styles } = useStyles();

  return (
    <span className={styles.label}>
      <PrincipalIcon details={details} />
      <span className={styles.name}>
        {details.kind === 'role' ? `@${details.name}` : details.name}
      </span>
    </span>
  );
}
