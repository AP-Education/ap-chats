/**
 * Manages over-the-air updates through the API (docs/adr/0008-app-updates.md). Run by the
 * update-* and register-runtime workflows with UPDATES_API_URL and UPDATES_ADMIN_TOKEN set.
 *
 *   node --import tsx scripts/updates/admin.ts status --channel <production|preview> [--platform <p>]
 *   node --import tsx scripts/updates/admin.ts rollout --update <id> --percent <0-100> [--resume]
 *   node --import tsx scripts/updates/admin.ts pause --update <id>
 *   node --import tsx scripts/updates/admin.ts rollback --update <id> [--embedded]
 *   node --import tsx scripts/updates/admin.ts register-runtime --platform <p> --build <number> \
 *     [--profile <eas build profile>] [--runtime <version>]
 *
 * register-runtime takes the runtime EAS recorded for the build unless --runtime names it; asking
 * EAS needs EXPO_TOKEN.
 */
import { parseArgs } from 'node:util';

import { adminApi } from './admin-api';
import { runtimeOfBuild } from './eas-builds';
import { parseChannel, parsePercent, parsePlatforms, requireEnv, summarize } from './env';
import { lastJson, mobileDir, run } from './run';
import { statusTable } from './status-table';

const EAS_CLI = 'eas-cli@27.2.0';

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const { values } = parseArgs({
    args: rest,
    options: {
      channel: { type: 'string' },
      platform: { type: 'string' },
      update: { type: 'string' },
      percent: { type: 'string' },
      embedded: { type: 'boolean', default: false },
      resume: { type: 'boolean', default: false },
      build: { type: 'string' },
      profile: { type: 'string', default: 'production' },
      runtime: { type: 'string' },
    },
  });
  const api = adminApi({
    apiUrl: requireEnv('UPDATES_API_URL'),
    token: requireEnv('UPDATES_ADMIN_TOKEN'),
  });
  const update = () => {
    if (!values.update) throw new Error('Name the update with --update <id>');
    return values.update;
  };

  switch (command) {
    case 'status': {
      const channel = parseChannel(values.channel);
      const platform = values.platform ? parsePlatforms(values.platform) : undefined;
      const updates = await api.list(channel, platform?.length === 1 ? platform[0] : undefined);
      await summarize(`### Updates on \`${channel}\`\n\n${statusTable(updates)}`);
      return;
    }
    case 'rollout': {
      const percent = parsePercent(values.percent);
      // A paused update keeps its pause unless this run says to lift it.
      await api.setRollout(update(), percent, values.resume);
      await summarize(
        `Update \`${update()}\` now reaches ${percent}% of phones` +
          (values.resume ? ' (resumed).' : '.'),
      );
      return;
    }
    case 'pause':
      await api.pause(update());
      await summarize(`Update \`${update()}\` is paused: no new phones take it.`);
      return;
    case 'rollback': {
      const result = await api.rollback(update(), values.embedded);
      await summarize(
        `Update \`${update()}\` is revoked. ` +
          (result.kind === 'rollback_to_embedded'
            ? `Phones return to their store bundle (\`${result.id}\`).`
            : `Phones move to \`${result.id}\`, a republish of \`${result.sourceUpdateId}\`.`),
      );
      return;
    }
    case 'register-runtime': {
      const platforms = parsePlatforms(values.platform);
      if (platforms.length !== 1) throw new Error('--platform must be ios or android');
      const platform = platforms[0]!;
      const buildNumber = Number(values.build);
      if (!Number.isInteger(buildNumber) || buildNumber < 1)
        throw new Error('--build must be the store build number');
      const runtimeVersion =
        values.runtime ?? (await easRuntime(platform, buildNumber, values.profile));
      await api.registerRuntime(platform, runtimeVersion, buildNumber);
      await summarize(
        `${platform} build ${buildNumber} registered with runtime \`${runtimeVersion}\`.`,
      );
      return;
    }
    default:
      throw new Error('Use status, rollout, pause, rollback or register-runtime');
  }
}

async function easRuntime(platform: string, buildNumber: number, profile: string): Promise<string> {
  requireEnv('EXPO_TOKEN');
  const output = await run(
    'npx',
    [
      '--yes',
      EAS_CLI,
      'build:list',
      '--platform',
      platform,
      '--build-profile',
      profile,
      '--app-build-version',
      String(buildNumber),
      '--status',
      'finished',
      '--limit',
      '10',
      '--json',
      '--non-interactive',
    ],
    { cwd: mobileDir },
  );
  return runtimeOfBuild(lastJson(output), buildNumber);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
