import { IconButton } from '@ap-education/ui';
import { XIcon } from '@phosphor-icons/react';
import { Button } from 'antd';
import { useState } from 'react';

import type { CallStatus } from '../api/calls-api';
import { callActionLabel } from '../callActionLabel';
import { CallIcon } from '../callIcons';
import { CALL_ACCEPT_COLOURS } from '../callTheme';
import { useActiveCall } from '../hooks/useActiveCall';
import { useDeclineIncomingCall } from '../hooks/useDeclineIncomingCall';
import { useKnownCallAction } from '../hooks/useKnownCallAction';
import styles from './ActiveCallBanner.module.css';
import { useCallDuration } from './ActiveCallOverlay/useCallDuration';

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
  const activeCall = useActiveCall(workspaceId, channelId);
  const call = useKnownCallAction(workspaceId, channelId, title, calleeAvatarPath, activeCall.data);
  const decline = useDeclineIncomingCall();
  const duration = useCallDuration(activeCall.data?.answeredAt ?? null);
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
    <div className={styles.banner} style={CALL_ACCEPT_COLOURS} role="status">
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
