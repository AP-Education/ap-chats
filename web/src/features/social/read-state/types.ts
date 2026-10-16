import type { ReadState } from '../messaging/types';

// Mirrors SocialEventsRelay on the API: a cursor gone back reaches only the reader's own devices.
export type ReadStateServerToClientEvents = {
  'social:read-state-rewound': (
    payload: ReadState & { workspaceId: string; channelId: string },
  ) => void;
};
