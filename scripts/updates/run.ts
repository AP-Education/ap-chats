import { spawn } from 'node:child_process';
import path from 'node:path';

/** The Expo project the updates are made from. */
export const mobileDir = path.resolve(__dirname, '../../mobile');

/** Runs a command, streaming its errors, and gives back what it printed. */
export function run(
  command: string,
  args: readonly string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    let output = '';
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0
        ? resolve(output)
        : reject(new Error(`${command} ${args.join(' ')} exited with ${code}`)),
    );
  });
}

/** The last line of output that is a JSON object or array: tools print notes before it. */
export function lastJson(output: string): unknown {
  const start = Math.max(output.lastIndexOf('\n{'), output.lastIndexOf('\n['));
  return JSON.parse(start === -1 ? output : output.slice(start + 1));
}
