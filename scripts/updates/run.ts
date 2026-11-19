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
    let timedOut = false;
    const settle = (finish: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      process.off('exit', stopGroup);
      process.off('SIGINT', onSignal);
      process.off('SIGTERM', onSignal);
      finish();
    };
    const stopGroup = () => signalGroup(child.pid, 'SIGKILL');
    // Without these an interrupted script would leave the group running: the group is in its own
    // session, so Ctrl+C does not reach it, and Node's default handler skips 'exit' hooks.
    const onSignal = (signal: NodeJS.Signals) => {
      stopGroup();
      process.exit(signal === 'SIGINT' ? 130 : 143);
    };
    process.once('exit', stopGroup);
    process.once('SIGINT', onSignal);
    process.once('SIGTERM', onSignal);
    const timer = setTimeout(() => {
      timedOut = true;
      signalGroup(child.pid, 'SIGTERM');
      // Reports the timeout only once the group is gone: the caller may exit right after, and
      // nothing would be left to finish the job. A stuck grandchild may hold the pipe open, so
      // this does not wait for 'close'.
      void groupGone(child.pid, GRACE_MS).then(() => {
        stopGroup();
        settle(() => reject(new Error(`${line} took longer than ${limit / 60_000} min`)));
      });
    }, limit);
    let output = '';
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on('error', (error) => settle(() => reject(error)));
    child.on('close', (code) => {
      if (timedOut) return;
      settle(() =>
        code === 0 ? resolve(output) : reject(new Error(`${line} exited with ${code}`)),
      );
    });
  });
}

/** How long a group gets to stop on SIGTERM before it is killed. */
const GRACE_MS = 10_000;

/** Resolves once no process is left in the group, or after `ms`. */
async function groupGone(pid: number | undefined, ms: number): Promise<void> {
  const deadline = Date.now() + ms;
  while (pid !== undefined && Date.now() < deadline) {
    try {
      process.kill(-pid, 0);
    } catch {
      return;
    }
    await new Promise((done) => setTimeout(done, 100));
  }
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
