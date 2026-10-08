import { message as toast } from 'antd';

import { useChannel } from '@/features/communities/channels/hooks/useChannels';

import type { CallSignal } from '../schemas';
import { useCallStore } from '../store/call-store';
import { useDeclineIncomingCall } from './useDeclineIncomingCall';
import { useJoinCall } from './useJoinCall';

export interface IncomingCallActionPresentation {
  ariaLabel: string;
  actionLabel: string;
  pending: boolean;
  onClick: () => void;
}

export interface IncomingCallPresentation {
  cardAriaLabel: string;
  headline: string;
  subtitle: string;
  avatarPath: string | null;
  avatarAlt: string;
  dismiss: IncomingCallActionPresentation;
  accept: IncomingCallActionPresentation;
}

/**
 * Resolves everything IncomingCallCard renders — a DM ring and a channel ring
 * share the same card, but differ in who the headline names, what dismissing
 * means, and whether the call stage gets a single callee to wait for. Keeping
 * that DM/channel split here, as data, means the card itself stays a fixed
 * layout with no branching to read through.
 */
export function useIncomingCallPresentation(signal: CallSignal): IncomingCallPresentation {
  const decline = useDeclineIncomingCall();
  const clearIncoming = useCallStore((state) => state.clearIncoming);
  const isDm = signal.channelKind === 'dm';
  const starterName = signal.startedByDisplayName ?? 'Колега';
  // A channel member is already in the sidebar's channel list by the time a
  // call there can ring them, so this resolves from cache almost every time —
  // no loading flash for the common case.
  const channel = useChannel(
    isDm ? undefined : signal.workspaceId,
    isDm ? undefined : signal.channelId,
  );
  const channelName = channel.data?.name ?? 'канал';
  // Undefined (not the starter's photo) marks this a channel call to the call
  // stage: it has no single callee, unlike a DM's one-on-one waiting screen.
  const join = useJoinCall(
    signal.workspaceId,
    signal.channelId,
    isDm ? starterName : channelName,
    isDm ? signal.startedByAvatarPath : undefined,
  );

  function handleDismiss() {
    // A channel ring has nobody on the other end to notify of a decline —
    // ActiveCallBanner draws the same line — so this only clears the local card.
    if (!isDm) {
      clearIncoming(signal.callId);
      return;
    }
    decline.mutate(signal, {
      onError: () => toast.error('Не вдалося відхилити дзвінок.'),
    });
  }

  function handleAccept() {
    join.mutate(signal.callId, {
      onError: () => toast.error('Не вдалося приєднатися до дзвінка.'),
    });
  }

  return {
    cardAriaLabel: isDm ? `Вхідний дзвінок від ${starterName}` : `Дзвінок у каналі ${channelName}`,
    headline: isDm ? starterName : `#${channelName}`,
    subtitle: isDm ? 'Вхідний дзвінок' : `Розпочав(-ла) ${starterName}`,
    avatarPath: signal.startedByAvatarPath,
    avatarAlt: starterName,
    dismiss: {
      ariaLabel: isDm ? 'Відхилити дзвінок' : 'Приховати сповіщення про дзвінок',
      actionLabel: isDm ? 'Відхилити' : 'Приховати',
      pending: decline.isPending,
      onClick: handleDismiss,
    },
    accept: {
      ariaLabel: isDm ? 'Прийняти дзвінок' : 'Приєднатися до дзвінка',
      actionLabel: isDm ? 'Прийняти' : 'Приєднатися',
      pending: join.isPending,
      onClick: handleAccept,
    },
  };
}
