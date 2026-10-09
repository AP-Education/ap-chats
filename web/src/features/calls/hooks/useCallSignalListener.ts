import { useQueryClient } from '@tanstack/react-query';
import { message as toast } from 'antd';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';
import { getCallEntry } from '@/features/social/messaging/api/messages-api';
import { mergeHistoryItem } from '@/features/social/messaging/history-cache';

import { type CallSignal, callSignalSchema } from '../schemas';
import { useCallStore } from '../store/call-store';
import type { CallServerToClientEvents } from '../types';
import { activeCallQueryKey } from './useActiveCall';
import { callHistoryKey } from './useCallHistory';

function parse(payload: unknown): CallSignal | null {
  const result = callSignalSchema.safeParse(payload);
  if (!result.success) {
    console.error('Невалідний call-сигнал', result.error);
    return null;
  }
  return result.data;
}

/** Keeps the call store, the "active call" indicators, and the channel's
 * timeline card in sync with the server, app-wide. */
export function useCallSignalListener(): void {
  const queryClient = useQueryClient();
  const { token, identity } = useQueryAuth();
  const setIncoming = useCallStore((state) => state.setIncoming);
  const clearIncoming = useCallStore((state) => state.clearIncoming);
  const active = useCallStore((state) => state.active);
  const clearActive = useCallStore((state) => state.clearActive);

  function invalidate(signal: CallSignal) {
    queryClient.invalidateQueries({
      queryKey: activeCallQueryKey(signal.workspaceId, signal.channelId),
    });
    // Only DM calls ever show in the calls tab, but a channel call's signal
    // costs nothing extra to ignore versus filtering channelKind here too.
    queryClient.invalidateQueries({ queryKey: callHistoryKey(identity) });
  }

  // The call's status (ringing/active/ended/declined) lives on its timeline
  // card too; refresh that one cached item rather than the whole history.
  function refreshEntry(signal: CallSignal) {
    if (!token) return;
    void getCallEntry(token, signal.workspaceId, signal.channelId, signal.callId)
      .then((item) =>
        mergeHistoryItem(queryClient, identity, signal.workspaceId, signal.channelId, item),
      )
      .catch(() => undefined);
  }

  useSocketEvent<CallServerToClientEvents>('call:incoming', (payload) => {
    const signal = parse(payload);
    if (!signal) return;
    // A channel call rings every member the same way a DM does now — only the
    // card's wording differs (IncomingCallCard), not whether it shows at all.
    setIncoming(signal);
    invalidate(signal);
  });

  useSocketEvent<CallServerToClientEvents>('call:accepted', (payload) => {
    const signal = parse(payload);
    if (!signal) return;
    // Someone answered — on whichever device, including a different one of
    // this same user's. Any device still showing this as "ringing" (this one
    // included, if it hasn't itself joined) needs to drop that now.
    clearIncoming(signal.callId);
    invalidate(signal);
    refreshEntry(signal);
  });

  useSocketEvent<CallServerToClientEvents>('call:declined', (payload) => {
    const signal = parse(payload);
    if (!signal) return;
    clearIncoming(signal.callId);
    if (active?.callId === signal.callId) {
      clearActive();
      toast.info('Дзвінок відхилено.');
    }
    invalidate(signal);
    refreshEntry(signal);
  });

  useSocketEvent<CallServerToClientEvents>('call:ended', (payload) => {
    const signal = parse(payload);
    if (!signal) return;
    clearIncoming(signal.callId);
    // The call screen closing and the leave chime already say this; a toast
    // on top is redundant.
    if (active?.callId === signal.callId) clearActive();
    invalidate(signal);
    refreshEntry(signal);
  });

  useSocketEvent<CallServerToClientEvents>('call:missed', (payload) => {
    const signal = parse(payload);
    if (!signal) return;
    clearIncoming(signal.callId);
    if (active?.callId === signal.callId) {
      clearActive();
      toast.info('Не відповіли.');
    }
    invalidate(signal);
    refreshEntry(signal);
  });
}
