import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import type { TestContext } from 'node:test';

// An isolated Valkey process, never the application's own instance.
export async function startValkey(t: TestContext): Promise<number> {
  const listener = createServer().listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const { port } = listener.address() as { port: number };
  listener.close();

  const server = spawn('valkey-server', [
    '--port',
    String(port),
    '--save',
    '',
    '--appendonly',
    'no',
  ]);
  t.after(() => server.kill('SIGTERM'));

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.stdout.on('data', (chunk: Buffer) => {
      if (chunk.toString().includes('Ready to accept connections')) resolve();
    });
  });

  return port;
}
