import { useTranslation } from 'react-i18next';

import { callActionLabel } from '@/features/calls/callActionLabel';
import { CallIcon } from '@/features/calls/callIcons';
import { CALL_ACCEPT_COLOURS } from '@/features/calls/callTheme';
import { useKnownCallAction } from '@/features/calls/hooks/useKnownCallAction';
import { useConversationScope } from '@/features/social/conversation-scope/store';

import type { CallHistoryItem } from '../../types';
import styles from './CallBubbleAction.module.css';

/** Telegram's trailing call button: joins a call that still runs, otherwise calls back. */
export function CallBubbleAction({ call }: { call: CallHistoryItem['call'] }) {
  const { t } = useTranslation('messaging');
  const { t: callsT } = useTranslation('calls');
  const { workspaceId, channelId, title, avatarPath } = useConversationScope();
  const action = useKnownCallAction(workspaceId, channelId, title, avatarPath, call);
  const label = callActionLabel(
    action,
    t(($) => $.call.callAgain),
    callsT,
  );

  return (
    <button
      type="button"
      className={styles.action}
      style={CALL_ACCEPT_COLOURS}
      data-live={action.joinable || undefined}
      aria-label={label}
      disabled={action.busy || action.pending}
      onClick={action.onClick}
    >
      <CallIcon size={24} weight="fill" />
    </button>
  );
}
