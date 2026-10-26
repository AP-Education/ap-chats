import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface LinkCandidate {
  oidcUserId: string;
  displayName: string;
  score: number;
}

export interface ReviewEntry {
  discordUserId: string;
  discordNames: string[];
  candidates: LinkCandidate[];
}

/** `links` is what the import uses; move an entry from `review` into it by hand to accept it. */
export interface MemberLinks {
  links: Record<string, string>;
  review: ReviewEntry[];
}

export function memberLinksPath(guildId: string): string {
  return path.join(__dirname, 'links', `${guildId}.json`);
}

export async function readMemberLinks(filePath: string): Promise<MemberLinks | undefined> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as MemberLinks;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

export async function writeMemberLinks(filePath: string, memberLinks: MemberLinks): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(memberLinks, null, 2)}\n`);
}
