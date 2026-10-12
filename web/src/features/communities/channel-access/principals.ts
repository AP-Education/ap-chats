import {
  channelCapabilities,
  type ChannelPermissions,
  type ChannelPermissionsInput,
  type Principal,
  type PrincipalView,
} from './types';

/** A new channel the whole workspace reads and writes in. */
export const openChannelPermissions: ChannelPermissionsInput = {
  view: [],
  post: [{ kind: 'everyone' }],
  manage: [],
};

export function principalKey(principal: Principal | PrincipalView): string {
  switch (principal.kind) {
    case 'everyone':
      return 'everyone';
    case 'role':
      return `role:${principal.roleId}`;
    case 'member':
      return `member:${principal.memberId}`;
  }
}

export function principalFromKey(key: string): Principal {
  const [kind, id] = key.split(':');
  if (kind === 'role' && id) return { kind: 'role', roleId: id };
  if (kind === 'member' && id) return { kind: 'member', memberId: id };
  return { kind: 'everyone' };
}

export function toPermissionsInput(permissions: ChannelPermissions): ChannelPermissionsInput {
  const input = { view: [], post: [], manage: [] } as ChannelPermissionsInput;
  for (const capability of channelCapabilities)
    input[capability] = permissions[capability].map((principal) =>
      principalFromKey(principalKey(principal)),
    );
  return input;
}
