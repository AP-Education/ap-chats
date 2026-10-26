import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, constants, copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

export interface KeptFile {
  /** Its path in the dump. */
  file: string;
  size: number;
}

const FETCHED_INDEX = path.join('files', 'fetched.json');
const PREFETCH_CONCURRENCY = 8;

const isLink = (source: string) => /^https?:\/\//.test(source);
const isDiscordFile = (link: string) =>
  /^https:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.net)\/attachments\//.test(link);

/** A fresh link for an expired Discord file link, when the bot can ask for one. */
export type LinkRefresher = (link: string) => Promise<string | null>;

async function sha256Of(file: string): Promise<string> {
  const hash = createHash('sha256');
  await pipeline(createReadStream(file), hash);
  return hash.digest('hex');
}

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

// Discord signs its file links for a day; the rest of the link names the file for good.
function unsignedLink(link: string): string {
  const url = new URL(link);
  return `${url.origin}${url.pathname}`;
}

/**
 * The dump's files, named by their content, so the same file exported twice is kept once. A file
 * the export only links to is fetched and remembered by its link, so a rerun has it whatever became
 * of the link; an expired Discord link is renewed through the bot first.
 */
export class DumpFiles {
  private readonly kept = new Map<string, KeptFile | null>();

  private constructor(
    private readonly dumpDir: string,
    private readonly fetched: Record<string, KeptFile>,
    private readonly refresh: LinkRefresher | null,
  ) {}

  static async open(dumpDir: string, refresh: LinkRefresher | null): Promise<DumpFiles> {
    const index = path.join(dumpDir, FETCHED_INDEX);
    const fetched = (await exists(index))
      ? (JSON.parse(await readFile(index, 'utf8')) as Record<string, KeptFile>)
      : {};
    return new DumpFiles(dumpDir, fetched, refresh);
  }

  /** Fetches linked files a few at a time ahead of the pass that keeps them one by one. */
  async prefetch(sources: string[]): Promise<void> {
    const links = [...new Set(sources.filter(isLink))];
    let next = 0;
    let done = 0;
    const worker = async () => {
      while (next < links.length) {
        await this.keep(links[next++]!);
        if (++done % 200 === 0 || done === links.length)
          console.error(`links: ${done}/${links.length}`);
      }
    };
    await Promise.all(Array.from({ length: PREFETCH_CONCURRENCY }, worker));
  }

  /** Null for a link Discord no longer serves. */
  async keep(source: string): Promise<KeptFile | null> {
    if (!this.kept.has(source)) {
      this.kept.set(source, isLink(source) ? await this.fetch(source) : await this.copy(source));
    }
    return this.kept.get(source)!;
  }

  async saveIndex(): Promise<void> {
    const sorted = Object.fromEntries(
      Object.entries(this.fetched).sort(([a], [b]) => a.localeCompare(b)),
    );
    await mkdir(path.join(this.dumpDir, 'files'), { recursive: true });
    await writeFile(path.join(this.dumpDir, FETCHED_INDEX), `${JSON.stringify(sorted, null, 2)}\n`);
  }

  private async copy(source: string): Promise<KeptFile> {
    const file = path.join(
      'files',
      `${await sha256Of(source)}${path.extname(source).toLowerCase()}`,
    );
    const target = path.join(this.dumpDir, file);
    if (!(await exists(target))) {
      await mkdir(path.dirname(target), { recursive: true });
      // A copy-on-write clone where the disk allows it, so the dump costs no space beside the exports.
      await copyFile(source, target, constants.COPYFILE_FICLONE);
    }

    return { file, size: (await stat(target)).size };
  }

  private async fetch(link: string): Promise<KeptFile | null> {
    const key = unsignedLink(link);
    const known = this.fetched[key];
    if (known) return known;

    let response = await fetch(link);
    const freshLink =
      !response.ok && this.refresh && isDiscordFile(link) && (await this.refresh(link));
    if (freshLink) response = await fetch(freshLink);
    if (!response.ok) return null;

    const body = Buffer.from(await response.arrayBuffer());
    const extension = path.extname(new URL(link).pathname).toLowerCase();
    const file = path.join(
      'files',
      `${createHash('sha256').update(body).digest('hex')}${extension}`,
    );
    const target = path.join(this.dumpDir, file);
    if (!(await exists(target))) {
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, body);
    }

    this.fetched[key] = { file, size: body.length };
    return this.fetched[key];
  }
}
