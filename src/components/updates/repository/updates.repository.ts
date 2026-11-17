import type { AppUpdateStatus, ShellPlatform } from '@/database/drizzle/schema';

import type {
  AppUpdateSummary,
  LaunchReport,
  NewAppUpdate,
  OfferedAppUpdate,
  StoredAppUpdate,
  UpdateListFilter,
  UpdateTarget,
} from '../types';

export abstract class UpdatesRepository {
  /** Active updates for one runtime and channel, newest first. */
  abstract findOffered(target: UpdateTarget): Promise<OfferedAppUpdate[]>;

  /**
   * Adds one launch to the day's counts. Reports for a runtime or update that was never
   * published are dropped, so an unauthenticated caller cannot invent rows.
   */
  abstract countLaunch(launch: LaunchReport, day: string): Promise<void>;

  /**
   * Records that a store build ships this native runtime. The first build keeps the entry: later
   * builds with the same fingerprint run the same updates.
   */
  abstract registerRuntime(
    platform: ShellPlatform,
    runtimeVersion: string,
    buildNumber: number,
  ): Promise<void>;

  /** False when no store build has the runtime, so the update could never be launched. */
  abstract hasRuntime(platform: ShellPlatform, runtimeVersion: string): Promise<boolean>;

  abstract create(update: NewAppUpdate): Promise<string>;

  /** Newest first, with launch counts summed over all days. */
  abstract list(filter: UpdateListFilter): Promise<AppUpdateSummary[]>;

  abstract find(id: string): Promise<StoredAppUpdate | undefined>;

  /** Changing the rollout also resumes a paused update. */
  abstract setRollout(id: string, rolloutPercent: number): Promise<void>;

  abstract setStatus(id: string, status: AppUpdateStatus): Promise<void>;

  /**
   * The newest bundle still offered on the same runtime and channel that was published before
   * `update`: the one a rollback republishes.
   */
  abstract findPreviousBundle(update: StoredAppUpdate): Promise<StoredAppUpdate | undefined>;
}
