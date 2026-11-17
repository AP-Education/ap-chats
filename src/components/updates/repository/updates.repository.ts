import type { ShellPlatform } from '@/database/drizzle/schema';

import type {
  AppUpdateSummary,
  LaunchReport,
  NewAppUpdate,
  OfferedAppUpdate,
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
}
