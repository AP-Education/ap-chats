import { message as toast } from 'antd';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('calls');
  const decline = useDeclineIncomingCall();
  const clearIncoming = useCallStore((state) => state.clearIncoming);
  const isDm = signal.channelKind === 'dm';
  const starterName = signal.startedByDisplayName ?? t(($) => $.colleague);
  // A channel member is already in the sidebar's channel list by the time a
  // call there can ring them, so this resolves from cache almost every time —
  // no loading flash for the common case.
  const channel = useChannel(
    isDm ? undefined : signal.workspaceId,
    isDm ? undefined : signal.channelId,
  );
  const channelName = channel.data?.name ?? t(($) => $.channel);
  // Undefined (not the starter's photo) marks this a channel call to the call
  // stage: it has no single callee, unlike a DM's one-on-one waiting screen.
  const join = useJoinCall(
    signal.workspaceId,
    signal.channelId,
    isDm ? starterName : channelName,
    isDm ? signal.startedByAvatarPath : undefined,
  );

  // A channel ring declined here keeps ringing for everyone else, and stops on this person's
  // other devices; the card goes at once, since nobody waits on the answer.
  function handleDismiss() {
    if (!isDm) {
      clearIncoming(signal.callId);
      decline.mutate(signal);
      return;
    }
    decline.mutate(signal, {
      onError: () => toast.error(t(($) => $.errors.decline)),
    });
  }

  function handleAccept() {
    join.mutate(signal.callId, {
      onError: () => toast.error(t(($) => $.errors.join)),
    });
  }

  return {
    cardAriaLabel: isDm
      ? t(($) => $.incoming.fromPerson, { name: starterName })
      : t(($) => $.incoming.inChannel, { name: channelName }),
    headline: isDm ? starterName : `#${channelName}`,
    subtitle: isDm
      ? t(($) => $.incomingCall)
      : t(($) => $.incoming.startedBy, { name: starterName }),
    avatarPath: signal.startedByAvatarPath,
    avatarAlt: starterName,
    dismiss: {
      ariaLabel: isDm ? t(($) => $.declineCall) : t(($) => $.hideCallNotice),
      actionLabel: isDm ? t(($) => $.incoming.decline) : t(($) => $.incoming.hide),
      pending: decline.isPending,
      onClick: handleDismiss,
    },
    accept: {
      ariaLabel: isDm ? t(($) => $.incoming.acceptCall) : t(($) => $.joinCall),
      actionLabel: isDm ? t(($) => $.incoming.accept) : t(($) => $.join),
      pending: join.isPending,
      onClick: handleAccept,
    },
  };
}
