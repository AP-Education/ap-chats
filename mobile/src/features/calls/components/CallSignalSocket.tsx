import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';

import { useAuthStore } from '../../auth';
import { useNativeCallStore } from '../store/native-call-store';
import { loadCallKitModule } from '../utils/callkit-module';
import { findTrackedSessionIdByServerCallId } from '../utils/session-registry';

const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

/**
 * Closes the gap VoIP push can't: the backend only ever pushes `call:incoming`
 * (see call-push.listener.ts — there's no supported push shape to remotely
 * cancel an already-shown ring), so a decline/hangup/timeout on the other end
 * never reaches a device that's already ringing or connected. Mirrors web/'s
 * useCallSignalListener over the same realtime socket, just to dismiss the
 * native CallKit/Telecom session instead of updating a React store.
 */
export function CallSignalSocket() {
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (status !== 'signed-in' || !apiUrl) return;

    const socket: Socket = io(`${apiUrl}/chats`, {
      // Re-read on every (re)connect attempt, like web/'s socket-client.ts —
      // not just once here, so a refreshed token is picked up without
      // tearing this socket down and recreating it.
      auth: (callback) => {
        const current = useAuthStore.getState();
        callback({ token: current.status === 'signed-in' ? current.tokens.accessToken : '' });
      },
    });

    function dismiss(payload: unknown) {
      const callId = (payload as { callId?: unknown } | null)?.callId;
      if (typeof callId !== 'string') return;
      const sessionId = findTrackedSessionIdByServerCallId(callId);
      if (!sessionId) return;
      void loadCallKitModule().then((CallKit) =>
        CallKit?.endCall(sessionId).catch(() => undefined),
      );
    }

    function dismissIfStillRinging(payload: unknown) {
      const callId = (payload as { callId?: unknown } | null)?.callId;
      if (typeof callId !== 'string') return;
      const sessionId = findTrackedSessionIdByServerCallId(callId);
      if (!sessionId) return;
      // `call:accepted` reaches every device, including whichever one just
      // answered — its own tracked session is already past 'ringing' there,
      // so this is that device hearing an echo of its own accept, not a
      // signal to hang up the call it just connected.
      const call = useNativeCallStore.getState().call;
      if (call?.sessionId === sessionId && call.status !== 'ringing') return;
      void loadCallKitModule().then((CallKit) =>
        CallKit?.endCall(sessionId).catch(() => undefined),
      );
    }

    socket.on('call:accepted', dismissIfStillRinging);
    socket.on('call:declined', dismiss);
    socket.on('call:ended', dismiss);
    socket.on('call:missed', dismiss);

    return () => {
      socket.disconnect();
    };
  }, [status]);

  return null;
}
