import { createStyles, keyframes } from 'antd-style';

import { callActionLabel } from '@/features/calls/callActionLabel';
import { CallIcon } from '@/features/calls/callIcons';
import { CALL_PALETTE } from '@/features/calls/callTheme';
import { useKnownCallAction } from '@/features/calls/hooks/useKnownCallAction';
import { useConversationScope } from '@/features/social/conversation/store';

import type { CallHistoryItem } from '../../types';

const ripple = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(47, 158, 107, 0.45); }
  70% { box-shadow: 0 0 0 10px rgba(47, 158, 107, 0); }
  100% { box-shadow: 0 0 0 0 rgba(47, 158, 107, 0); }
`;

const useStyles = createStyles(({ token, css }) => ({
  // A solid green handset, so calling back reads as the bubble's one action.
  action: css`
    display: grid;
    place-items: center;
    flex: 0 0 48px;
    height: 48px;

    @media (max-width: ${token.screenMD}px) {
      flex-basis: 52px;
      height: 52px;
    }

    padding: 0;
    border: 0;
    border-radius: 50%;
    background: ${CALL_PALETTE.accept};
    color: #fff;
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover:not(:disabled) {
      background: ${CALL_PALETTE.acceptHover};
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  `,
  live: css`
    animation: ${ripple} 1.8s ease-out infinite;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `,
}));

/** Telegram's trailing call button: joins a call that still runs, otherwise calls back. */
export function CallBubbleAction({ call }: { call: CallHistoryItem['call'] }) {
  const { styles, cx } = useStyles();
  const { workspaceId, channelId, title, avatarPath } = useConversationScope();
  const action = useKnownCallAction(workspaceId, channelId, title, avatarPath, call);
  const label = callActionLabel(action, 'Подзвонити знову');

  return (
    <button
      type="button"
      className={cx(styles.action, action.joinable && styles.live)}
      aria-label={label}
      disabled={action.busy || action.pending}
      onClick={action.onClick}
    >
      <CallIcon size={24} weight="fill" />
    </button>
  );
}
