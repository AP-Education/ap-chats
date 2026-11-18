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
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: childEnv(process.env, options.env),
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    const limit = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 10_000).unref();
    }, limit);
    let output = '';
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      const line = `${command} ${args.join(' ')}`;
      if (timedOut) reject(new Error(`${line} took longer than ${limit / 60_000} min`));
      else if (code === 0) resolve(output);
      else reject(new Error(`${line} exited with ${code}`));
    });
  });
}

/** The last line of output that is a JSON object or array: tools print notes before it. */
export function lastJson(output: string): unknown {
  const start = Math.max(output.lastIndexOf('\n{'), output.lastIndexOf('\n['));
  return JSON.parse(start === -1 ? output : output.slice(start + 1));
}
