import { setTimeout as sleep } from 'node:timers/promises';

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  position: number;
  permissions: string;
  managed: boolean;
}

export interface DiscordOverwrite {
  id: string;
  type: 0 | 1;
  allow: string;
  deny: string;
}

export interface DiscordChannel {
  id: string;
  type: number;
  name: string;
  position: number;
  parent_id: string | null;
  permission_overwrites: DiscordOverwrite[];
}

export interface DiscordMember {
  user: { id: string; username: string; global_name: string | null; bot?: boolean };
  nick: string | null;
  roles: string[];
}

export interface DiscordGuild {
  id: string;
  name: string;
  roles: DiscordRole[];
  channels: DiscordChannel[];
  members: DiscordMember[];
}

const DISCORD_API = 'https://discord.com/api/v10';

async function discordFetch(token: string, path: string, init: RequestInit = {}) {
  for (;;) {
    const response = await fetch(`${DISCORD_API}${path}`, {
      ...init,
      headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
    });
    if (response.status !== 429) return response;

    const { retry_after } = (await response.json()) as { retry_after: number };
    await sleep(retry_after * 1000);
  }
}

export async function discordGet<T>(token: string, path: string): Promise<T> {
  const response = await discordFetch(token, path);
  if (!response.ok) {
    throw new Error(`Discord GET ${path}: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as T;
}

// Discord signs a file link for a day; this asks for a fresh signature and changes nothing.
export async function refreshFileLink(token: string, link: string): Promise<string | null> {
  const response = await discordFetch(token, '/attachments/refresh-urls', {
    method: 'POST',
    body: JSON.stringify({ attachment_urls: [link] }),
  });
  if (!response.ok) return null;

  const { refreshed_urls } = (await response.json()) as {
    refreshed_urls: { original: string; refreshed: string }[];
  };
  return refreshed_urls[0]?.refreshed ?? null;
}

export async function fetchMembers(token: string, guildId: string): Promise<DiscordMember[]> {
  const members: DiscordMember[] = [];
  let after = '0';

  for (;;) {
    const page = await discordGet<DiscordMember[]>(
      token,
      `/guilds/${guildId}/members?limit=1000&after=${after}`,
    );
    members.push(...page);

    const last = page.at(-1);
    if (page.length < 1000 || !last) return members;
    after = last.user.id;
  }
}

export async function fetchGuild(token: string, guildId: string): Promise<DiscordGuild> {
  const [guild, roles, channels, members] = await Promise.all([
    discordGet<{ id: string; name: string }>(token, `/guilds/${guildId}`),
    discordGet<DiscordRole[]>(token, `/guilds/${guildId}/roles`),
    discordGet<DiscordChannel[]>(token, `/guilds/${guildId}/channels`),
    fetchMembers(token, guildId),
  ]);

  return { id: guild.id, name: guild.name, roles, channels, members };
}
