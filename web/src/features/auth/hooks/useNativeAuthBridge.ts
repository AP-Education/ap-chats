import { useEffect, useState } from 'react';

import type { NativeToWebMessage } from '../types';

export type NativeAuthState =
  | { status: 'signed-out' } // waiting for native
  | { status: 'unavailable' } // no OIDC client configured natively
  | {
      status: 'signed-in';
      accessToken: string;
      profile?: { name?: string; picture?: string; sub?: string };
    };

// Drains window.ApAppNative.queue on mount to cover messages native sent before this listener was registered.
export function useNativeAuthBridge(): NativeAuthState {
  const [state, setState] = useState<NativeAuthState>({ status: 'signed-out' });

  useEffect(() => {
    const bridge = (window.ApAppNative ??= {});

    function handle(message: NativeToWebMessage) {
      if (message.type === 'auth/unavailable') {
        setState({ status: 'unavailable' });
        return;
      }
      setState({
        status: 'signed-in',
        accessToken: message.payload.accessToken,
        profile: message.payload.idToken ? decodeProfile(message.payload.idToken) : undefined,
      });
    }

    bridge.onMessage = handle;
    const queued = bridge.queue ?? [];
    bridge.queue = [];
    queued.forEach(handle);

    return () => {
      if (bridge.onMessage === handle) bridge.onMessage = undefined;
    };
  }, []);

  return state;
}

function decodeProfile(idToken: string): { name?: string; picture?: string; sub?: string } {
  try {
    const payload = idToken.split('.')[1];
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as {
      name?: unknown;
      picture?: unknown;
      sub?: unknown;
    };
    return {
      name: typeof json.name === 'string' ? json.name : undefined,
      picture: typeof json.picture === 'string' ? json.picture : undefined,
      sub: typeof json.sub === 'string' ? json.sub : undefined,
    };
  } catch {
    return {};
  }
}
