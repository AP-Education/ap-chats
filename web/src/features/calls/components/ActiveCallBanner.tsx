import { PhoneIcon, XIcon } from '@phosphor-icons/react';
import { Button } from 'antd';
import { createStyles, keyframes } from 'antd-style';
import { useState } from 'react';

import { IconButton } from '@/shared/ui/IconButton';

import { callActionLabel } from '../callActionLabel';
import { useActiveCall } from '../hooks/useActiveCall';
import { useCallAction } from '../hooks/useCallAction';
import { useDeclineIncomingCall } from '../hooks/useDeclineIncomingCall';
import { useCallDuration } from './ActiveCallOverlay/useCallDuration';

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
`;

const useStyles = createStyles(({ token, css }) => ({
  banner: css`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
    padding: 8px 20px;
    background: ${token.colorPrimaryBg};
    border-bottom: 1px solid ${token.colorPrimaryBorder};
    color: ${token.colorPrimaryTextActive};

    @media (max-width: ${token.screenMD}px) {
      padding: 8px 12px;
    }
  `,
  dot: css`
    width: 8px;
    height: 8px;
    flex-shrink: 0;
    border-radius: 50%;
    background: ${token.colorSuccess};
    animation: ${pulse} 1.6s ease-in-out infinite;
  `,
  info: css`
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex: 1;
    min-width: 0;
  `,
  label: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
  `,
  duration: css`
    flex-shrink: 0;
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextSecondary};
    font-variant-numeric: tabular-nums;
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
  const call = useCallAction(workspaceId, channelId, title, calleeAvatarPath);
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
      <span className={styles.dot} aria-hidden />
      <PhoneIcon size={17} weight="fill" />
      <span className={styles.info}>
        <span className={styles.label}>
          {activeCall.data.status === 'ringing' ? 'Вхідний дзвінок' : 'Дзвінок триває'}
        </span>
        <span className={styles.duration}>{duration}</span>
      </span>
      <Button
        type="primary"
        size="small"
        loading={call.pending}
        disabled={call.busy}
        onClick={call.onClick}
      >
        {callActionLabel(call, 'Приєднатися')}
      </Button>
      <IconButton
        size={28}
        aria-label={isDm ? 'Відхилити дзвінок' : 'Приховати сповіщення про дзвінок'}
        onClick={handleDismiss}
      >
        <XIcon size={16} />
      </IconButton>
    </div>
  );
}
