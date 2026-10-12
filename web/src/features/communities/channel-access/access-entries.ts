import { principalFromKey, principalKey } from './principals';
import {
  channelCapabilities,
  type ChannelCapability,
  type ChannelPermissionsInput,
  type Principal,
} from './types';

/** One whom the channel names, and the most it lets them do; every lower right comes with it. */
export interface AccessEntry {
  principal: Principal;
  level: ChannelCapability;
}

const rank: Record<ChannelCapability, number> = { view: 1, post: 2, manage: 3 };

function highest(a: ChannelCapability, b: ChannelCapability): ChannelCapability {
  return rank[a] >= rank[b] ? a : b;
}

/** Folds the three lists into one entry per principal, in the order they first appear. */
export function toAccessEntries(permissions: ChannelPermissionsInput): AccessEntry[] {
  const entries = new Map<string, AccessEntry>();
  for (const capability of channelCapabilities)
    for (const principal of permissions[capability]) {
      const key = principalKey(principal);
      const existing = entries.get(key);
      entries.set(key, {
        principal,
        level: existing ? highest(existing.level, capability) : capability,
      });
    }

  return [...entries.values()];
}

/** Each principal goes only into the list of its level; the lists below it are implied. */
export function fromAccessEntries(entries: AccessEntry[]): ChannelPermissionsInput {
  const permissions: ChannelPermissionsInput = { view: [], post: [], manage: [] };
  for (const { principal, level } of entries)
    permissions[level].push(principalFromKey(principalKey(principal)));
  return permissions;
}

export function grants(level: ChannelCapability, capability: ChannelCapability): boolean {
  return rank[level] >= rank[capability];
}

/**
 * The level after one switch: turning a right on brings the ones below it, turning it off
 * takes the ones above it. `null` means the principal no longer sees the channel at all.
 */
export function switchCapability(
  level: ChannelCapability,
  capability: ChannelCapability,
  enabled: boolean,
): ChannelCapability | null {
  if (enabled) return highest(level, capability);
  if (!grants(level, capability)) return level;

  const below = channelCapabilities[rank[capability] - 2];
  return below ?? null;
}
