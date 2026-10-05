import { useEffect } from 'react';
import { AppState } from 'react-native';
import { io, type Socket } from 'socket.io-client';

import { useAuthStore } from '../../auth';
import { useNativeCallStore } from '../store/native-call-store';
import { loadCallKitModule } from '../utils/callkit-module';
import { requireAccessToken } from '../utils/require-access-token';
import { findTrackedSessionIdByServerCallId } from '../utils/session-registry';
import { synchronizeCallSession } from '../utils/synchronize-call-session';

const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

/**
 * Closes the gap VoIP push can't: the backend only ever pushes `call:incoming`
 * (see call-push.worker.ts — there's no supported push shape to remotely
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
        void requireAccessToken().then(
          (token) => callback({ token }),
          () => callback({ token: '' }),
        );
      },
    });

    function dismiss(payload: unknown, onlyRinging = false) {
      const callId = (payload as { callId?: unknown } | null)?.callId;
      if (typeof callId !== 'string') return;
      const sessionId = findTrackedSessionIdByServerCallId(callId);
      if (!sessionId) return;
      // `call:accepted` reaches every device, including whichever one just
      // answered — its own tracked session is already past 'ringing' there,
      // so this is that device hearing an echo of its own accept, not a
      // signal to hang up the call it just connected.
      const call = useNativeCallStore.getState().call;
      if (onlyRinging && call?.sessionId === sessionId && call.status !== 'ringing') return;
      void loadCallKitModule().then((CallKit) =>
        CallKit?.endCall(sessionId).catch(() => undefined),
      );
    }

    const synchronize = () => {
      void loadCallKitModule()
        .then((CallKit) => CallKit && synchronizeCallSession(CallKit))
        .catch(() => undefined);
    };
    socket.on('connect', synchronize);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        socket.connect();
        synchronize();
      }
    });
    socket.on('connect_error', (error: Error & { data?: { code?: string } }) => {
      if (error.data?.code === 'AUTH_TOKEN_EXPIRED')
        void useAuthStore
          .getState()
          .refreshNow()
          .then(() => socket.connect());
    });
    socket.on('call:accepted', (payload: unknown) => dismiss(payload, true));
    socket.on('call:declined', (payload: unknown) => dismiss(payload));
    socket.on('call:ended', (payload: unknown) => dismiss(payload));
    socket.on('call:missed', (payload: unknown) => dismiss(payload));

    return () => {
      appState.remove();
      socket.disconnect();
    };
  }, [status]);

  return null;
}
