import { z } from 'zod';

// Adapted locally from backend-LMS/src/globals/config. Keep this copy small:
// Chats owns its deployment settings and does not have a shared package yet.
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
    CHAT_UPLOAD_MAX_FILE_BYTES: z.coerce
      .number()
      .int()
      .min(1)
      .max(1_000_000_000)
      .default(1_000_000_000),
    CHAT_UPLOAD_MAX_MESSAGE_BYTES: z.coerce
      .number()
      .int()
      .min(1)
      .max(10_000_000_000)
      .default(2_000_000_000),
    CHAT_UPLOAD_MAX_FILES: z.coerce.number().int().min(1).max(10).default(10),
    // Caps unfinished uploads per member, independent of the per-message limits above:
    // an abuse/cost guard against reserving storage that never gets attached to a message.
    CHAT_UPLOAD_MAX_PENDING_FILES: z.coerce.number().int().min(1).max(1000).default(20),
    CHAT_UPLOAD_MAX_PENDING_BYTES: z.coerce
      .number()
      .int()
      .min(1)
      .max(50_000_000_000)
      .default(4_000_000_000),
    // Calls are off (CallsModule stays unregistered) until all three are set.
    LIVEKIT_URL: z.preprocess((value) => value || undefined, z.string().min(1).optional()),
    LIVEKIT_API_KEY: z.preprocess((value) => value || undefined, z.string().min(1).optional()),
    LIVEKIT_API_SECRET: z.preprocess((value) => value || undefined, z.string().min(1).optional()),
    // iOS VoIP push (CallKit wake-up). Off — call ringing then only reaches
    // devices with the app already open — until all four are set.
    APNS_KEY_ID: z.preprocess((value) => value || undefined, z.string().min(1).optional()),
    APNS_TEAM_ID: z.preprocess((value) => value || undefined, z.string().min(1).optional()),
    APNS_PRIVATE_KEY: z.preprocess((value) => value || undefined, z.string().min(1).optional()),
    APNS_VOIP_TOPIC: z.preprocess((value) => value || undefined, z.string().min(1).optional()),
    // Android VoIP push (Telecom wake-up via a high-priority FCM data message).
    FCM_PROJECT_ID: z.preprocess((value) => value || undefined, z.string().min(1).optional()),
    FCM_SERVICE_ACCOUNT_JSON: z.preprocess(
      (value) => value || undefined,
      z.string().min(1).optional(),
    ),
  })
  .superRefine((config, context) => {
    if (config.CHAT_UPLOAD_MAX_MESSAGE_BYTES < config.CHAT_UPLOAD_MAX_FILE_BYTES) {
      context.addIssue({
        code: 'custom',
        path: ['CHAT_UPLOAD_MAX_MESSAGE_BYTES'],
        message: 'Must allow at least one maximum size file',
      });
    }
    if (config.CHAT_UPLOAD_MAX_PENDING_BYTES < config.CHAT_UPLOAD_MAX_FILE_BYTES) {
      context.addIssue({
        code: 'custom',
        path: ['CHAT_UPLOAD_MAX_PENDING_BYTES'],
        message: 'Must allow at least one maximum size file to be reserved',
      });
    }
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
    const livekit = ['LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET'] as const;
    if (livekit.some((key) => config[key]) && !livekit.every((key) => config[key])) {
      for (const key of livekit) {
        if (!config[key]) {
          context.addIssue({ code: 'custom', path: [key], message: 'Set all three or none' });
        }
      }
    }
    const apnsVoip = [
      'APNS_KEY_ID',
      'APNS_TEAM_ID',
      'APNS_PRIVATE_KEY',
      'APNS_VOIP_TOPIC',
    ] as const;
    if (apnsVoip.some((key) => config[key]) && !apnsVoip.every((key) => config[key])) {
      for (const key of apnsVoip) {
        if (!config[key]) {
          context.addIssue({ code: 'custom', path: [key], message: 'Set all four or none' });
        }
      }
    }
    const fcm = ['FCM_PROJECT_ID', 'FCM_SERVICE_ACCOUNT_JSON'] as const;
    if (fcm.some((key) => config[key]) && !fcm.every((key) => config[key])) {
      for (const key of fcm) {
        if (!config[key]) {
          context.addIssue({ code: 'custom', path: [key], message: 'Set both or neither' });
        }
      }
    }
  });

export type AppConfig = z.infer<typeof schema>;

export function validateConfig(env: Record<string, unknown>): AppConfig {
  const result = schema.safeParse(env);
  if (result.success) return result.data;
  const details = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  throw new Error(`Invalid AP Chats configuration:\n${details.join('\n')}`);
}
