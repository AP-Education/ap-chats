import type {
  DiscordChannel,
  DiscordGuild,
  DiscordMember,
  DiscordOverwrite,
  DiscordRole,
} from './discord-api';
import {
  bySnowflake,
  type Capability,
  type DumpedGrant,
  type GuildDump,
  uniqueNames,
} from './dump-format';

const ChannelType = {
  text: 0,
  category: 4,
  announcement: 5,
  forum: 15,
  media: 16,
} as const;
// Voice and stage channels stay behind: calls here start in any channel.
const MESSAGE_CHANNEL_TYPES = new Set<number>([
  ChannelType.text,
  ChannelType.announcement,
  ChannelType.forum,
  ChannelType.media,
]);

const Permission = {
  administrator: 1n << 3n,
  manageChannels: 1n << 4n,
  viewChannel: 1n << 10n,
  sendMessages: 1n << 11n,
  manageMessages: 1n << 13n,
  manageRoles: 1n << 28n,
} as const;
const ALL_PERMISSIONS = ~0n;
const MANAGE_PERMISSIONS =
  Permission.manageChannels | Permission.manageMessages | Permission.manageRoles;

interface PermissionLayer {
  allow: bigint;
  deny: bigint;
}

function toHexColor(color: number): string | null {
  return color ? `#${color.toString(16).padStart(6, '0')}` : null;
}

function toLayer(overwrite: DiscordOverwrite | undefined): PermissionLayer[] {
  return overwrite ? [{ allow: BigInt(overwrite.allow), deny: BigInt(overwrite.deny) }] : [];
}

function combineLayers(layers: PermissionLayer[]): PermissionLayer[] {
  if (!layers.length) return [];
  return [
    {
      allow: layers.reduce((acc, layer) => acc | layer.allow, 0n),
      deny: layers.reduce((acc, layer) => acc | layer.deny, 0n),
    },
  ];
}

// Discord's own order: server permissions, then @everyone, roles and member overwrites in turn.
function channelPermissions(serverPermissions: bigint, layers: PermissionLayer[]): bigint {
  if (serverPermissions & Permission.administrator) return ALL_PERMISSIONS;

  return layers.reduce(
    (permissions, layer) => (permissions & ~layer.deny) | layer.allow,
    serverPermissions,
  );
}

function capabilitiesOf(permissions: bigint): Set<Capability> {
  const capabilities = new Set<Capability>();
  if (!(permissions & Permission.viewChannel)) return capabilities;

  capabilities.add('view');
  if (permissions & Permission.sendMessages) capabilities.add('post');
  if (permissions & MANAGE_PERMISSIONS) capabilities.add('manage');
  return capabilities;
}

function without(capabilities: Set<Capability>, covered: Set<Capability>): Capability[] {
  return [...capabilities].filter((capability) => !covered.has(capability));
}

// Our lists only add access, so each role or person gets what @everyone does not already have.
function grantsOf(
  channel: DiscordChannel,
  guildId: string,
  everyoneRole: DiscordRole,
  importedRoles: DiscordRole[],
  membersById: Map<string, DiscordMember>,
): DumpedGrant[] {
  const overwrites = new Map(
    channel.permission_overwrites.map((overwrite) => [overwrite.id, overwrite]),
  );
  const everyonePermissions = BigInt(everyoneRole.permissions);
  const everyoneLayer = toLayer(overwrites.get(guildId));

  const everyoneCapabilities = capabilitiesOf(
    channelPermissions(everyonePermissions, everyoneLayer),
  );
  const grants: DumpedGrant[] = [...everyoneCapabilities].map((capability) => ({
    capability,
    principal: 'everyone',
  }));

  const roleCapabilities = new Map<string, Set<Capability>>();
  for (const role of importedRoles) {
    const permissions = channelPermissions(everyonePermissions | BigInt(role.permissions), [
      ...everyoneLayer,
      ...toLayer(overwrites.get(role.id)),
    ]);
    const capabilities = capabilitiesOf(permissions);
    roleCapabilities.set(role.id, capabilities);

    for (const capability of without(capabilities, everyoneCapabilities)) {
      grants.push({ capability, principal: 'role', roleId: role.id });
    }
  }

  const memberOverwrites = channel.permission_overwrites.filter(
    (overwrite) => overwrite.type === 1,
  );
  for (const overwrite of memberOverwrites) {
    const member = membersById.get(overwrite.id);
    if (!member) continue;

    const heldRoles = importedRoles.filter((role) => member.roles.includes(role.id));
    const serverPermissions = heldRoles.reduce(
      (acc, role) => acc | BigInt(role.permissions),
      everyonePermissions,
    );
    const permissions = channelPermissions(serverPermissions, [
      ...everyoneLayer,
      ...combineLayers(heldRoles.flatMap((role) => toLayer(overwrites.get(role.id)))),
      ...toLayer(overwrite),
    ]);

    const covered = new Set([
      ...everyoneCapabilities,
      ...heldRoles.flatMap((role) => [...(roleCapabilities.get(role.id) ?? [])]),
    ]);
    for (const capability of without(capabilitiesOf(permissions), covered)) {
      grants.push({ capability, principal: 'member', personId: member.user.id });
    }
  }

  return grants;
}

/** The server as the bot sees it: every role, category and channel, and who may see each. */
export function apiStructure(guild: DiscordGuild): Omit<GuildDump, 'guild' | 'structure'> {
  const everyoneRole = guild.roles.find((role) => role.id === guild.id);
  if (!everyoneRole) throw new Error('Discord returned no @everyone role');

  const importedRoles = guild.roles.filter((role) => role.id !== guild.id && !role.managed);
  const importedRoleIds = new Set(importedRoles.map((role) => role.id));
  const roleNames = uniqueNames(importedRoles);
  const rolesTopFirst = [...importedRoles].sort(
    (a, b) => b.position - a.position || bySnowflake(a, b),
  );

  const discordCategories = guild.channels.filter(
    (channel) => channel.type === ChannelType.category,
  );
  const categoryNames = uniqueNames(discordCategories);
  const categoriesInOrder = [...discordCategories].sort(
    (a, b) => a.position - b.position || bySnowflake(a, b),
  );

  const discordChannels = guild.channels
    .filter((channel) => MESSAGE_CHANNEL_TYPES.has(channel.type))
    .sort(bySnowflake);
  const channelNames = uniqueNames(discordChannels);
  const membersById = new Map(guild.members.map((member) => [member.user.id, member]));

  return {
    roles: rolesTopFirst.map((role, position) => ({
      id: role.id,
      name: roleNames.get(role.id)!,
      color: toHexColor(role.color),
      position,
      isHoisted: role.hoist,
    })),
    categories: categoriesInOrder.map((category, position) => ({
      id: category.id,
      name: categoryNames.get(category.id)!,
      position,
    })),
    channels: discordChannels.map((channel) => ({
      id: channel.id,
      name: channelNames.get(channel.id)!,
      categoryId: channel.parent_id,
      grants: grantsOf(channel, guild.id, everyoneRole, importedRoles, membersById),
      history: null,
    })),
    people: guild.members
      .map((member) => ({
        id: member.user.id,
        displayName: member.nick ?? member.user.global_name ?? member.user.username,
        username: member.user.username,
        isBot: Boolean(member.user.bot),
        avatar: null,
        roleIds: member.roles.filter((roleId) => importedRoleIds.has(roleId)).sort(),
      }))
      .sort(bySnowflake),
  };
}
