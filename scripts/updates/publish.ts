/**
 * Publishes the mobile shell's JavaScript as an over-the-air update (docs/adr/0008-app-updates.md):
 * exports it, puts its files in the bucket and registers it with the API. Run by the
 * publish-update workflow; locally it needs the same environment.
 *
 *   node --import tsx scripts/updates/publish.ts --platform <ios|android|all> \
 *     --channel <production|preview> [--notes <text>] [--mandatory] [--rollout <percent>]
 *
 * The bundle carries the EXPO_PUBLIC_* variables of the channel's EAS environment, which must be
 * in the environment first (`eas env:pull`): the same values the store build was made with.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { adminApi, AdminApiError } from './admin-api';
import { parseChannel, parsePercent, parsePlatforms, requireEnv, summarize } from './env';
import { manifestOf, readExport, type ShellPlatform, type UpdateChannel } from './manifest';
import { lastJson, mobileDir, run } from './run';
import { spacesStore, uploadMissing } from './spaces';

async function main() {
  const { values } = parseArgs({
    options: {
      platform: { type: 'string' },
      channel: { type: 'string' },
      notes: { type: 'string' },
      mandatory: { type: 'boolean', default: false },
      rollout: { type: 'string' },
    },
  });
  const platforms = parsePlatforms(values.platform);
  const channel = parseChannel(values.channel);
  const rolloutPercent = values.rollout === undefined ? undefined : parsePercent(values.rollout);
  requireEnv('EXPO_PUBLIC_API_URL');

  const api = adminApi({
    apiUrl: requireEnv('UPDATES_API_URL'),
    token: requireEnv('UPDATES_ADMIN_TOKEN'),
  });
  const store = spacesStore({
    endpoint: requireEnv('UPDATES_SPACES_ENDPOINT'),
    bucket: requireEnv('UPDATES_SPACES_BUCKET'),
    accessKey: requireEnv('UPDATES_SPACES_KEY'),
    secretKey: requireEnv('UPDATES_SPACES_SECRET'),
  });
  const assetsUrl = requireEnv('UPDATES_ASSETS_URL');
  const gitCommit = process.env.GITHUB_SHA ?? (await run('git', ['rev-parse', 'HEAD'])).trim();

  for (const platform of platforms) {
    const id = await publish(platform, channel);
    await summarize(
      `**${platform}** → \`${channel}\`: update \`${id}\`` +
        (values.mandatory ? ' (mandatory)' : ''),
    );
  }

  async function publish(platform: ShellPlatform, channel: UpdateChannel): Promise<string> {
    // The app config reads these, and the fingerprint hashes the app config.
    const env = {
      APP_UPDATES_CHANNEL: channel,
      EXPO_PUBLIC_APNS_ENVIRONMENT: process.env.EXPO_PUBLIC_APNS_ENVIRONMENT ?? 'production',
    };
    const resolved = lastJson(
      await run(
        'pnpm',
        [
          'exec',
          'expo-updates',
          'runtimeversion:resolve',
          '--platform',
          platform,
          '--workflow',
          'managed',
        ],
        { cwd: mobileDir, env },
      ),
    ) as { runtimeVersion?: unknown };
    if (typeof resolved.runtimeVersion !== 'string') throw new Error('No runtime version resolved');
    const runtimeVersion = resolved.runtimeVersion;

    const exportDir = await mkdtemp(path.join(tmpdir(), `update-${platform}-`));
    try {
      await run(
        'pnpm',
        ['exec', 'expo', 'export', '--platform', platform, '--output-dir', exportDir],
        { cwd: mobileDir, env },
      );
      const bundle = await readExport(exportDir, platform, assetsUrl);
      const expoClient = await appConfig(env);
      const uploaded = await uploadMissing(store, [bundle.launchAsset, ...bundle.assets]);
      console.log(`${platform}: ${uploaded.sent} files sent, ${uploaded.kept} already there`);

      const { id } = await api.publish({
        platform,
        channel,
        runtimeVersion,
        manifest: { ...manifestOf(bundle), expoClient },
        mandatory: values.mandatory,
        gitCommit,
        ...(rolloutPercent === undefined ? {} : { rolloutPercent }),
        ...(values.notes ? { notes: values.notes } : {}),
        ...(process.env.GITHUB_ACTOR ? { createdBy: process.env.GITHUB_ACTOR } : {}),
      });
      return id;
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 409)
        throw new Error(
          `${error.message}\nNo ${platform} store build has runtime ${runtimeVersion}. Its native ` +
            'code differs from this commit, so it needs a store release, then register-runtime.',
          { cause: error },
        );
      throw error;
    } finally {
      await rm(exportDir, { recursive: true, force: true });
    }
  }
}

/**
 * The public app config, as the binary embeds it. After an update launches, `Constants.expoConfig`
 * comes from the manifest instead, and the app needs it for `extra.eas.projectId` (push tokens).
 */
async function appConfig(env: NodeJS.ProcessEnv): Promise<Record<string, unknown>> {
  const config = lastJson(
    await run('pnpm', ['exec', 'expo', 'config', '--json', '--type', 'public'], {
      cwd: mobileDir,
      env,
    }),
  );
  if (typeof config !== 'object' || config === null || Array.isArray(config))
    throw new Error('expo config printed no app config');
  const { extra } = config as { extra?: { eas?: { projectId?: unknown } } };
  if (typeof extra?.eas?.projectId !== 'string')
    throw new Error('The app config has no extra.eas.projectId, which push tokens need');
  return config as Record<string, unknown>;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
