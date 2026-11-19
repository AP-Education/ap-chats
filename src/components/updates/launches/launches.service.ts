import { Injectable } from '@nestjs/common';

import { UpdatesRepository } from '../repository';
import type { LaunchReport } from '../types';

@Injectable()
export class LaunchesService {
  constructor(private readonly updates: UpdatesRepository) {}

  /** Counted against the UTC day the server received it on; the phone's clock is not trusted. */
  report(launch: LaunchReport, now = new Date()): Promise<void> {
    return this.updates.countLaunch(launch, now.toISOString().slice(0, 10));
  }
}
