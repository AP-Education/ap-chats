import { spawn } from 'node:child_process';
import path from 'node:path';

/** The Expo project the updates are made from. */
export const mobileDir = path.resolve(__dirname, '../../mobile');

/** Only the scripts themselves call the API and the bucket; no tool they run needs these. */
const SECRETS = ['UPDATES_ADMIN_TOKEN', 'UPDATES_SPACES_KEY', 'UPDATES_SPACES_SECRET'] as const;

/** Long enough for a cold Metro export, short enough not to hold an urgent rollback for long. */
const DEFAULT_TIMEOUT_MS = 15 * 60_000;

/** The environment a child process gets: this one's, without the update secrets. */
export function childEnv(
  parent: NodeJS.ProcessEnv,
  extra: NodeJS.ProcessEnv = {},
): NodeJS.ProcessEnv {
  const env = { ...parent, ...extra };
  for (const name of SECRETS) delete env[name];
  return env;
}

/** Runs a command, streaming its errors, and gives back what it printed. */
export function run(
  command: string,
  args: readonly string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv; timeoutMs?: number } = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Its own process group, so a timeout also stops what it started (pnpm starts expo, which
    // starts Metro) and nothing is left holding the output pipe open.
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: childEnv(process.env, options.env),
      stdio: ['ignore', 'pipe', 'inherit'],
      detached: true,
    });
    const line = `${command} ${args.join(' ')}`;
    const limit = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    let settled = false;
    const settle = (finish: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      process.off('exit', stopGroup);
      finish();
    };
    const stopGroup = () => signalGroup(child.pid, 'SIGKILL');
    // Without this an interrupted script would leave the group running.
    process.once('exit', stopGroup);
    const timer = setTimeout(() => {
      signalGroup(child.pid, 'SIGTERM');
      setTimeout(() => signalGroup(child.pid, 'SIGKILL'), 10_000).unref();
      // Settles now: a stuck grandchild may hold the pipe open, so 'close' could never come.
      settle(() => reject(new Error(`${line} took longer than ${limit / 60_000} min`)));
    }, limit);
    let output = '';
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on('error', (error) => settle(() => reject(error)));
    child.on('close', (code) =>
      settle(() =>
        code === 0 ? resolve(output) : reject(new Error(`${line} exited with ${code}`)),
      ),
    );
  });
}

function signalGroup(pid: number | undefined, signal: NodeJS.Signals): void {
  if (pid === undefined) return;
  try {
    process.kill(-pid, signal);
  } catch {
    // The group is already gone.
  }
}

/** The last line of output that is a JSON object or array: tools print notes before it. */
export function lastJson(output: string): unknown {
  const start = Math.max(output.lastIndexOf('\n{'), output.lastIndexOf('\n['));
  return JSON.parse(start === -1 ? output : output.slice(start + 1));
}
