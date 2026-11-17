import type { LaunchReport, OfferedAppUpdate, UpdateTarget } from '../types';

export abstract class UpdatesRepository {
  /** Active updates for one runtime and channel, newest first. */
  abstract findOffered(target: UpdateTarget): Promise<OfferedAppUpdate[]>;

  /**
   * Adds one launch to the day's counts. Reports for a runtime or update that was never
   * published are dropped, so an unauthenticated caller cannot invent rows.
   */
  abstract countLaunch(launch: LaunchReport, day: string): Promise<void>;
}
