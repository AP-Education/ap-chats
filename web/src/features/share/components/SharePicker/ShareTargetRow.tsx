import { HashIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';

import { Avatar } from '@/shared/ui/Avatar';

import type { ShareTarget } from '../../share-targets';

const useStyles = createStyles(({ token, css }) => ({
  row: css`
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 8px;
    border: 0;
    border-radius: ${token.borderRadius}px;
    background: none;
    color: ${token.colorText};
    text-align: left;
    cursor: pointer;

    &:active {
      background: ${token.colorFillTertiary};
    }
  `,
  channel: css`
    display: grid;
    flex-shrink: 0;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: ${token.colorFillSecondary};
    color: ${token.colorTextSecondary};
  `,
  text: css`
    display: flex;
    flex-direction: column;
    min-width: 0;
  `,
  name: css`
    overflow: hidden;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  workspace: css`
    overflow: hidden;
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
}));

interface ShareTargetRowProps {
  target: ShareTarget;
  onPick: (target: ShareTarget) => void;
}

export function ShareTargetRow({ target, onPick }: ShareTargetRowProps) {
  const { styles } = useStyles();

  return (
    <button type="button" className={styles.row} onClick={() => onPick(target)}>
      {target.kind === 'direct' ? (
        <Avatar path={target.avatarPath} alt={target.name} size={40} shape="circle" />
      ) : (
        <span className={styles.channel} aria-hidden>
          <HashIcon size={20} />
        </span>
      )}
      <span className={styles.text}>
        <span className={styles.name}>{target.name}</span>
        {target.workspaceName && <span className={styles.workspace}>{target.workspaceName}</span>}
      </span>
    </button>
  );
}
