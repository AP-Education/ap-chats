import { z } from 'zod';

// Adapted locally from backend-LMS/src/globals/config. Keep this copy small:
// Connect owns its deployment settings and does not have a shared package yet.
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3211),
  WEB_ORIGIN: z.url().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

export type AppConfig = z.infer<typeof schema>;

export function validateConfig(env: Record<string, unknown>): AppConfig {
  const result = schema.safeParse(env);
  if (result.success) return result.data;
  const details = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  throw new Error(`Invalid AP Connect configuration:\n${details.join('\n')}`);
}
