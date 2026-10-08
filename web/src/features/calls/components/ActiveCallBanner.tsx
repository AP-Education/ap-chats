import { XIcon } from '@phosphor-icons/react';
import { Button } from 'antd';
import { createStyles, keyframes } from 'antd-style';
import { useState } from 'react';

import { IconButton } from '@/shared/ui/IconButton';

import type { CallStatus } from '../api/calls-api';
import { callActionLabel } from '../callActionLabel';
import { CallIcon } from '../callIcons';
import { CALL_PALETTE } from '../callTheme';
import { useActiveCall } from '../hooks/useActiveCall';
import { useDeclineIncomingCall } from '../hooks/useDeclineIncomingCall';
import { useKnownCallAction } from '../hooks/useKnownCallAction';
import { useCallDuration } from './ActiveCallOverlay/useCallDuration';

const ripple = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(47, 158, 107, 0.45); }
  70% { box-shadow: 0 0 0 8px rgba(47, 158, 107, 0); }
  100% { box-shadow: 0 0 0 0 rgba(47, 158, 107, 0); }
`;

const useStyles = createStyles(({ token, css }) => ({
  // The header's translucent panel material, frosted, the same as the pinned strip above it.
  banner: css`
    display: flex;
    align-items: center;
    gap: ${token.paddingSM}px;
    flex-shrink: 0;
    min-height: 56px;
    padding: 0 12px 0 20px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
    background: var(--app-surface, rgba(255, 255, 255, 0.62));
    backdrop-filter: blur(20px) saturate(1.6);

    @media (max-width: ${token.screenMD}px) {
      gap: 10px;
      padding-inline: 12px 8px;
    }
  `,
  icon: css`
    display: grid;
    place-items: center;
    flex: 0 0 32px;
    height: 32px;
    border-radius: 50%;
    background: ${CALL_PALETTE.accept};
    color: ${token.colorTextLightSolid};
    animation: ${ripple} 1.8s ease-out infinite;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `,
  info: css`
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    line-height: 18px;
  `,
  label: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: ${token.colorText};
    font-size: ${token.fontSizeSM}px;
    font-weight: 600;
  `,
  duration: css`
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
    font-variant-numeric: tabular-nums;
  `,
  join: css`
    &&:not(:disabled) {
      background: ${CALL_PALETTE.accept};
      color: ${token.colorTextLightSolid};
    }

    &&:not(:disabled):hover {
      background: ${CALL_PALETTE.acceptHover};
    }
  `,
  dismiss: css`
    color: ${token.colorTextSecondary};
  `,
}));

interface ActiveCallBannerProps {
  workspaceId: string;
  channelId: string;
  title: string;
  calleeAvatarPath?: string | null;
}

// Slack's huddle bar / Telegram's voice-chat strip: a call in this
// conversation stays visible above the messages for as long as it runs,
// instead of relying on someone spotting a line buried in the history.
export function ActiveCallBanner({
  workspaceId,
  channelId,
  title,
  calleeAvatarPath,
}: ActiveCallBannerProps) {
  const { styles } = useStyles();
  const activeCall = useActiveCall(workspaceId, channelId);
  const call = useKnownCallAction(workspaceId, channelId, title, calleeAvatarPath, activeCall.data);
  const decline = useDeclineIncomingCall();
  const duration = useCallDuration(activeCall.data ? Date.parse(activeCall.data.startedAt) : null);
  // A DM has exactly one other person to dismiss, so hiding this banner IS
  // declining — the same "one no one's left to talk to" line the ringtone
  // and the leave button both draw. A channel call keeps its personal,
  // purely local dismiss: ignoring it must never end it for whoever else
  // might still join. Keyed by call id so the next call gets its own banner.
  const isDm = calleeAvatarPath !== undefined;
  const [dismissedCallId, setDismissedCallId] = useState<string | null>(null);

  // Once you've joined, the app-level call bar already says so; a second
  // banner here would just repeat it.
  if (!activeCall.data || call.inCall || activeCall.data.id === dismissedCallId) return null;

  function handleDismiss() {
    if (!activeCall.data) return;
    setDismissedCallId(activeCall.data.id);
    if (isDm) decline.mutate({ workspaceId, channelId, callId: activeCall.data.id });
  }

  return (
    <div className={styles.banner} role="status">
      <span className={styles.icon} aria-hidden>
        <CallIcon size={18} weight="fill" />
      </span>
      <span className={styles.info}>
        <span className={styles.label}>{bannerLabel(activeCall.data.status)}</span>
        <span className={styles.duration}>{duration}</span>
      </span>
      <Button
        type="primary"
        shape="round"
        className={styles.join}
        loading={call.pending}
        disabled={call.busy}
        onClick={call.onClick}
      >
        {callActionLabel(call, 'Приєднатися')}
      </Button>
      <IconButton
        size={36}
        className={styles.dismiss}
        aria-label={isDm ? 'Відхилити дзвінок' : 'Приховати сповіщення про дзвінок'}
        onClick={handleDismiss}
      >
        <XIcon size={18} />
      </IconButton>
    </div>
  );
}

function bannerLabel(status: CallStatus): string {
  if (status === 'ringing') return 'Вхідний дзвінок';
  return 'Дзвінок триває';
}
