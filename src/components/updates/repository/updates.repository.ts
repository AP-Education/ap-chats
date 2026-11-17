import type { OfferedAppUpdate, UpdateTarget } from '../types';

export abstract class UpdatesRepository {
  /** Active updates for one runtime and channel, newest first. */
  abstract findOffered(target: UpdateTarget): Promise<OfferedAppUpdate[]>;
}
