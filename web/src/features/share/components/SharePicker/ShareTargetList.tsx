import { Skeleton } from 'antd';
import { createStyles } from 'antd-style';

import type { ShareTarget } from '../../share-targets';
import { ShareTargetRow } from './ShareTargetRow';

const useStyles = createStyles(({ token, css }) => ({
  list: css`
    flex: 1;
    min-height: 0;
    margin-top: 8px;
    overflow-y: auto;
    overscroll-behavior: contain;
  `,
  state: css`
    padding: 24px 8px;
    color: ${token.colorTextSecondary};
    text-align: center;
  `,
}));

interface ShareTargetListProps {
  targets: ShareTarget[];
  isLoading: boolean;
  onPick: (target: ShareTarget) => void;
}

export function ShareTargetList({ targets, isLoading, onPick }: ShareTargetListProps) {
  const { styles } = useStyles();

  if (isLoading && !targets.length) {
    return (
      <div className={styles.list}>
        <Skeleton active avatar paragraph={{ rows: 1 }} />
      </div>
    );
  }

  if (!targets.length) return <div className={styles.state}>Нічого не знайдено</div>;

  return (
    <div className={styles.list}>
      {targets.map((target) => (
        <ShareTargetRow key={target.channelId} target={target} onPick={onPick} />
      ))}
    </div>
  );
}
