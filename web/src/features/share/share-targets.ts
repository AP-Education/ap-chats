import type { Channel } from '@/features/communities/channels/types';
import type { DirectMessage } from '@/features/social/direct-messages/api/direct-messages-api';
import type { Workspace } from '@/features/workspaces/types';

/** A conversation something shared can go to. */
export interface ShareTarget {
  channelId: string;
  workspaceId: string;
  kind: 'direct' | 'channel';
  name: string;
  avatarPath: string | null;
  /** Where a channel lives, as two workspaces can each have one by the same name. */
  workspaceName: string | null;
}

export interface WorkspaceChannels {
  workspace: Workspace;
  channels: Channel[];
}

/** Personal conversations first, newest on top, then each workspace's channels; only where the person can write. */
export function shareTargets(
  directs: DirectMessage[],
  workspaces: WorkspaceChannels[],
): ShareTarget[] {
  const people = directs
    .filter(({ participant }) => participant.active)
    .map(({ id, workspaceId, participant }): ShareTarget => ({
      channelId: id,
      workspaceId,
      kind: 'direct',
      name: participant.displayName ?? 'Ім’я недоступне',
      avatarPath: participant.avatarPath,
      workspaceName: null,
    }));
  const channels = workspaces.flatMap(({ workspace, channels: list }) =>
    list
      .filter((channel) => channel.isMember && channel.canPost)
      .map((channel): ShareTarget => ({
        channelId: channel.id,
        workspaceId: workspace.id,
        kind: 'channel',
        name: channel.name,
        avatarPath: null,
        workspaceName: workspace.name,
      })),
  );

  return [...people, ...channels];
}

export function matchingTargets(targets: ShareTarget[], query: string): ShareTarget[] {
  const needle = query.trim().toLocaleLowerCase('uk');
  if (!needle) return targets;

  const matches = (text: string | null) => Boolean(text?.toLocaleLowerCase('uk').includes(needle));
  return targets.filter((target) => matches(target.name) || matches(target.workspaceName));
}

export function targetPath({ kind, channelId }: ShareTarget): string {
  return kind === 'direct' ? `/direct/${channelId}` : `/channels/${channelId}`;
}
