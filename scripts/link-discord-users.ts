/**
 * Links a dump's Discord people to AP accounts and writes the links restore-discord.ts picks up.
 * Reads the databases, never writes to them.
 *
 *   ACCOUNTS_DATABASE_URL=<backend-LMS database> node --env-file-if-exists=.env --import tsx \
 *     scripts/link-discord-users.ts --dump <dump folder> --application <AP application id>
 *
 * A Discord account someone linked on the platform is theirs for certain. Everyone else is matched
 * by name (Cyrillic or Latin, any order, handles and typos) against the application's staff and the
 * people already in Chats. Only clear, one-to-one matches go into `links`; close calls land in
 * `review` for a person to decide. Links already in the file are kept, unless the platform says
 * otherwise, so accepted or hand-written ones survive reruns. Without ACCOUNTS_DATABASE_URL only
 * the people already in Chats are matched.
 */
import { parseArgs } from 'node:util';

import { and, eq, isNotNull, notLike } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { userProfiles } from '../src/database/drizzle/schema';
import { readAccounts } from './discord/accounts-people';
import { type DumpedPerson, GUILD_FILE, type GuildDump, readDumpFile } from './discord/dump-format';
import {
  type LinkCandidate,
  memberLinksPath,
  readMemberLinks,
  type ReviewEntry,
  writeMemberLinks,
} from './discord/member-links';
import { compareAnyName, type NameMatch, nameParts } from './discord/name-matching';
import { PLACEHOLDER_OIDC_PREFIX } from './discord/placeholders';

interface Person {
  oidcUserId: string;
  displayName: string;
  /** Every name they go by, each as comparable parts. */
  names: string[][];
}

interface DiscordPerson {
  discordUserId: string;
  names: string[];
  parts: string[][];
}

interface Scored {
  person: Person;
  match: NameMatch;
}

const LINK_SCORE = 0.92;
const LINK_WEAKEST_PART = 0.9;
const LINK_MARGIN = 0.05;
const REVIEW_SCORE = 0.75;
const REVIEW_CANDIDATES = 3;

function toDiscordPerson(person: DumpedPerson): DiscordPerson {
  const names = [...new Set([person.displayName, person.username])];
  return { discordUserId: person.id, names, parts: names.map(nameParts) };
}

function rankCandidates(discordPerson: DiscordPerson, people: Person[]): Scored[] {
  return people
    .map((person) => ({
      person,
      match: person.names
        .map((name) => compareAnyName(discordPerson.parts, name))
        .reduce((best, match) => (match.score > best.score ? match : best)),
    }))
    .filter(({ match }) => match.score >= REVIEW_SCORE)
    .sort((a, b) => b.match.score - a.match.score);
}

function toCandidate({ person, match }: Scored): LinkCandidate {
  return {
    oidcUserId: person.oidcUserId,
    displayName: person.displayName,
    score: Math.round(match.score * 100) / 100,
  };
}

// Clear means: close in spelling, well ahead of the runner-up, and no other Discord member is as close.
function isClearMatch(best: Scored, runnerUp: Scored | undefined, rivalScore: number): boolean {
  return (
    best.match.score >= LINK_SCORE &&
    best.match.weakest >= LINK_WEAKEST_PART &&
    best.match.score - (runnerUp?.match.score ?? 0) >= LINK_MARGIN &&
    best.match.score - rivalScore >= LINK_MARGIN
  );
}

function linkPeople(
  discordPeople: DiscordPerson[],
  people: Person[],
): { links: Record<string, string>; review: ReviewEntry[] } {
  const ranked = discordPeople.map((discordPerson) => ({
    discordPerson,
    candidates: rankCandidates(discordPerson, people),
  }));

  const scoresByPerson = new Map<string, { discordUserId: string; score: number }[]>();
  for (const { discordPerson, candidates } of ranked) {
    for (const { person, match } of candidates) {
      const scores = scoresByPerson.get(person.oidcUserId) ?? [];
      scores.push({ discordUserId: discordPerson.discordUserId, score: match.score });
      scoresByPerson.set(person.oidcUserId, scores);
    }
  }
  const rivalScore = (oidcUserId: string, discordUserId: string) =>
    Math.max(
      0,
      ...(scoresByPerson.get(oidcUserId) ?? [])
        .filter((entry) => entry.discordUserId !== discordUserId)
        .map((entry) => entry.score),
    );

  const links: Record<string, string> = {};
  const review: ReviewEntry[] = [];
  for (const { discordPerson, candidates } of ranked) {
    const [best, runnerUp] = candidates;
    if (!best) continue;

    if (
      isClearMatch(best, runnerUp, rivalScore(best.person.oidcUserId, discordPerson.discordUserId))
    ) {
      links[discordPerson.discordUserId] = best.person.oidcUserId;
    } else {
      review.push({
        discordUserId: discordPerson.discordUserId,
        discordNames: discordPerson.names,
        candidates: candidates.slice(0, REVIEW_CANDIDATES).map(toCandidate),
      });
    }
  }
  return { links, review };
}

async function loadChatsPeople(databaseUrl: string): Promise<Person[]> {
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const rows = await drizzle(pool)
      .select({ oidcUserId: userProfiles.oidcUserId, displayName: userProfiles.displayName })
      .from(userProfiles)
      .where(
        and(
          notLike(userProfiles.oidcUserId, `${PLACEHOLDER_OIDC_PREFIX}%`),
          eq(userProfiles.isBot, false),
          isNotNull(userProfiles.displayName),
        ),
      );
    return rows.map((row) => ({
      oidcUserId: row.oidcUserId,
      displayName: row.displayName!,
      names: [nameParts(row.displayName!)],
    }));
  } finally {
    await pool.end();
  }
}

// Someone in Chats who is also staff is matched on every name either side knows.
function joinPeople(chats: Person[], staff: Person[]): Person[] {
  const people = new Map(chats.map((person) => [person.oidcUserId, person]));
  for (const person of staff) {
    const known = people.get(person.oidcUserId);
    people.set(
      person.oidcUserId,
      known ? { ...known, names: [...known.names, ...person.names] } : person,
    );
  }
  return [...people.values()];
}

async function main(): Promise<void> {
  const { values: args } = parseArgs({
    options: { dump: { type: 'string' }, application: { type: 'string' } },
  });
  const databaseUrl = process.env.DATABASE_URL;
  const accountsUrl = process.env.ACCOUNTS_DATABASE_URL;
  if (!databaseUrl || !args.dump) throw new Error('DATABASE_URL and --dump are required');
  if (accountsUrl && !args.application) {
    throw new Error('--application is required with ACCOUNTS_DATABASE_URL');
  }

  const dump = await readDumpFile<GuildDump>(args.dump, GUILD_FILE);
  const filePath = memberLinksPath(dump.guild.id);
  const accounts = accountsUrl
    ? await readAccounts(accountsUrl, args.application!)
    : { discordLinks: {}, staff: [] };

  const inDump = new Set(dump.people.map((person) => person.id));
  const platformLinks = Object.fromEntries(
    Object.entries(accounts.discordLinks).filter(([discordUserId]) => inDump.has(discordUserId)),
  );
  // The platform knows for certain: an earlier link it contradicts, either way round, gives way.
  const platformUsers = new Set(Object.values(platformLinks));
  const earlierLinks = (await readMemberLinks(filePath))?.links ?? {};
  const overruled = Object.entries(earlierLinks).filter(([discordUserId, userId]) =>
    discordUserId in platformLinks
      ? platformLinks[discordUserId] !== userId
      : platformUsers.has(userId),
  );
  const keptLinks = Object.fromEntries(
    Object.entries(earlierLinks).filter((link) => !overruled.includes(link)),
  );
  const existingLinks = { ...keptLinks, ...platformLinks };
  const alreadyLinkedPeople = new Set(Object.values(existingLinks));

  const discordPeople = dump.people
    .filter((person) => !person.isBot && !(person.id in existingLinks))
    .map(toDiscordPerson);
  const staff = accounts.staff.map((person) => ({
    oidcUserId: person.userId,
    displayName: person.names[0]!,
    names: person.names.map(nameParts),
  }));
  const people = joinPeople(await loadChatsPeople(databaseUrl), staff).filter(
    (person) => !alreadyLinkedPeople.has(person.oidcUserId),
  );

  const { links, review } = linkPeople(discordPeople, people);
  await writeMemberLinks(filePath, { links: { ...existingLinks, ...links }, review });

  console.log(
    JSON.stringify(
      {
        file: filePath,
        linkedOnPlatform: Object.keys(platformLinks).length,
        earlierLinksOverruled: overruled.length,
        kept: Object.keys(keptLinks).length,
        linkedByName: Object.keys(links).length,
        toReview: review.length,
        unmatched: discordPeople.length - Object.keys(links).length - review.length,
        candidates: people.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
