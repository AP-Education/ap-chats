import type { ShellInfo } from '../types/index.ts';

const FIELDS = [
  'appVersion',
  'buildNumber',
  'channel',
  'runtimeVersion',
  'updateId',
  'updateCreatedAt',
] as const satisfies readonly (keyof ShellInfo)[];

/** The `shell/info` payload, or null when the message is not one: the bridge is untrusted input. */
export function parseShellInfo(message: unknown): ShellInfo | null {
  if (!isRecord(message) || message.type !== 'shell/info' || !isRecord(message.payload)) {
    return null;
  }
  const { payload } = message;
  const info = {} as Record<keyof ShellInfo, string | null>;
  for (const field of FIELDS) {
    const value = payload[field];
    // Short strings only: these are shown as text and nothing longer is ever sent.
    info[field] = typeof value === 'string' && value && value.length <= 200 ? value : null;
  }
  return info;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
