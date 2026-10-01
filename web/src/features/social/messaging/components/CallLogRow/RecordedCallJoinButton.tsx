import { createStyles } from 'antd-style';

import { useKnownCallAction } from '@/features/calls/hooks/useKnownCallAction';
import { useConversationScope } from '@/features/social/conversation/store';

import type { CallHistoryItem } from '../../types';

const useStyles = createStyles(({ token, css }) => ({
  join: css`
    padding: 0;
    border: 0;
    background: transparent;
    color: ${token.colorPrimary};
    font: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;

    &:hover:not(:disabled) {
      text-decoration: underline;
    }

    &:disabled {
      color: ${token.colorTextQuaternary};
      cursor: not-allowed;
    }
  `,
}));

export function RecordedCallJoinButton({ call }: { call: CallHistoryItem['call'] }) {
  const { styles } = useStyles();
  const { workspaceId, channelId, title, avatarPath } = useConversationScope();
  const action = useKnownCallAction(workspaceId, channelId, title, avatarPath, call);

  return (
    <button
      type="button"
      className={styles.join}
      disabled={action.busy || action.pending}
      onClick={action.onClick}
    >
      {action.inCall ? 'Повернутися до дзвінка' : 'Приєднатися до дзвінка'}
    </button>
  );
}
