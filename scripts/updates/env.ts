import { appendFile } from 'node:fs/promises';

import type { ShellPlatform, UpdateChannel } from './manifest';

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Set ${name}`);
  return value;
}

export function parseChannel(value: string | undefined): UpdateChannel {
  if (value === 'production' || value === 'preview') return value;
  throw new Error('--channel must be production or preview');
}

export function parsePlatforms(value: string | undefined): ShellPlatform[] {
  if (value === 'ios' || value === 'android') return [value];
  if (value === 'all') return ['ios', 'android'];
  throw new Error('--platform must be ios, android or all');
}

export function parsePercent(value: string | undefined): number {
  const percent = Number(value);
  if (!Number.isInteger(percent) || percent < 0 || percent > 100)
    throw new Error('--percent must be a whole number from 0 to 100');
  return percent;
}

/** Into the job's summary on GitHub Actions; to the terminal anywhere else. */
export async function summarize(markdown: string): Promise<void> {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (file) await appendFile(file, `${markdown}\n\n`);
  console.log(markdown);
}
