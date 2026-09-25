import { z } from 'zod';

// Adapted locally from backend-LMS/src/globals/config. Keep this copy small:
// Connect owns its deployment settings and does not have a shared package yet.
const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().min(1).max(65535).default(3211),
    WEB_ORIGIN: z.url().default('http://localhost:5555'),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    LOG_TRANSPORT: z.enum(['json', 'pretty']).optional(),
    LOG_TARGET_TYPE: z.enum(['stdout', 'file', 'both']).default('stdout'),
    LOG_TARGET_DEST: z.string().min(1).optional(),
    DATABASE_URL: z.url(),
    OIDC_ISSUER: z.preprocess((value) => value || undefined, z.url().optional()),
    OIDC_AUDIENCE: z.preprocess((value) => value || undefined, z.string().min(1).optional()),
    DIGITAL_OCEAN_SPACES_ENDPOINT: z.string().min(1),
    DIGITAL_OCEAN_SPACES_ACCESS_KEY: z.string().min(1),
    DIGITAL_OCEAN_SPACES_SECRET_KEY: z.string().min(1),
    DIGITAL_OCEAN_SPACES_BUCKET: z.string().min(1),
  })
  .superRefine((config, context) => {
    if (config.LOG_TARGET_TYPE !== 'stdout' && !config.LOG_TARGET_DEST) {
      context.addIssue({
        code: 'custom',
        path: ['LOG_TARGET_DEST'],
        message: 'Required for file logging',
      });
    }
    const oidc = [config.OIDC_ISSUER, config.OIDC_AUDIENCE];
    if (config.NODE_ENV === 'production' || oidc.some(Boolean)) {
      for (const key of ['OIDC_ISSUER', 'OIDC_AUDIENCE'] as const) {
        if (!config[key]) {
          context.addIssue({ code: 'custom', path: [key], message: 'Required for OIDC' });
        }
      }
    }
    if (config.NODE_ENV === 'production' && config.OIDC_ISSUER?.startsWith('http:')) {
      context.addIssue({
        code: 'custom',
        path: ['OIDC_ISSUER'],
        message: 'HTTPS is required in production',
      });
    }
  });

export type AppConfig = z.infer<typeof schema>;

export function validateConfig(env: Record<string, unknown>): AppConfig {
  const result = schema.safeParse(env);
  if (result.success) return result.data;
  const details = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  throw new Error(`Invalid AP Connect configuration:\n${details.join('\n')}`);
}
