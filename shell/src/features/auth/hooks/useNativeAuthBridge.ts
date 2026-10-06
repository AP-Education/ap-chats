import { onNativeMessage } from '@ap/shell-sdk';
import { useEffect, useState } from 'react';

import type { NativeToWebMessage } from '../types';

export type NativeAuthState =
  | { status: 'signed-out' } // waiting for native
  | { status: 'unavailable' } // no OIDC client configured natively
  | {
      status: 'signed-in';
      accessToken: string;
      idToken?: string;
      profile?: { name?: string; picture?: string; sub?: string };
    };

export function useNativeAuthBridge(): NativeAuthState {
  const [state, setState] = useState<NativeAuthState>({ status: 'signed-out' });

  useEffect(() => {
    return onNativeMessage<NativeToWebMessage>((message) => {
      if (message.type === 'auth/unavailable') {
        setState({ status: 'unavailable' });
        return;
      }
      if (message.type !== 'auth/token') return;
      setState((previous) => ({
        status: 'signed-in',
        accessToken: message.payload.accessToken,
        idToken:
          message.payload.idToken ??
          (previous.status === 'signed-in' ? previous.idToken : undefined),
        profile: message.payload.idToken
          ? decodeProfile(message.payload.idToken)
          : previous.status === 'signed-in'
            ? previous.profile
            : undefined,
      }));
    });
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
