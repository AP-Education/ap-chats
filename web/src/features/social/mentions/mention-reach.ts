import type { MentionToken } from './mention-tokens';

/** How a message reached the person reading it, as the server recorded when it was written. */
export interface ViewerReach {
  memberId: string | undefined;
  /** Whether it reached them at all, by any reference. */
  mentioned: boolean;
  roleIds: readonly string[];
}

/** Whether this reference is one that reached the viewer, so its tag reads as theirs. */
export function reachesViewer(token: MentionToken, viewer: ViewerReach | undefined): boolean {
  if (!viewer) return false;

  switch (token.kind) {
    case 'member':
      return token.id === viewer.memberId;
    case 'role':
      return viewer.roleIds.includes(token.id);
    // @everyone reaches every reader but the author, so it reached them whenever anything did.
    case 'everyone':
      return viewer.mentioned;
    case 'channel':
      return false;
  }
}
