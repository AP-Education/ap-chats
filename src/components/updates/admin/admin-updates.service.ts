import { ConflictException, Injectable } from '@nestjs/common';

import { Logger } from '@/globals/logger';

import { UpdatesRepository } from '../repository';
import type { AppUpdateSummary } from '../types';
import type { ListUpdatesQueryDto, PublishUpdateDto, RegisterRuntimeDto } from './dto';

const defaultRollout = { production: 10, preview: 100 } as const;

@Injectable()
export class AdminUpdatesService {
  constructor(
    private readonly updates: UpdatesRepository,
    private readonly logger: Logger,
  ) {}

  registerRuntime({ platform, runtimeVersion, buildNumber }: RegisterRuntimeDto): Promise<void> {
    return this.updates.registerRuntime(platform, runtimeVersion, buildNumber);
  }

  async publish(dto: PublishUpdateDto): Promise<{ id: string }> {
    if (!(await this.updates.hasRuntime(dto.platform, dto.runtimeVersion)))
      throw new ConflictException(
        'No store build ships this runtime: its native code changed, so it needs a store release',
      );

    const id = await this.updates.create({
      kind: 'update',
      platform: dto.platform,
      channel: dto.channel,
      runtimeVersion: dto.runtimeVersion,
      manifest: dto.manifest,
      rolloutPercent: dto.rolloutPercent ?? defaultRollout[dto.channel],
      mandatory: dto.mandatory ?? false,
      sourceUpdateId: null,
      gitCommit: dto.gitCommit ?? null,
      notes: dto.notes ?? null,
      createdBy: dto.createdBy ?? null,
    });
    this.logger.info(
      { updateId: id, platform: dto.platform, channel: dto.channel, gitCommit: dto.gitCommit },
      'Update published',
    );
    return { id };
  }

  list({ channel, platform, limit }: ListUpdatesQueryDto): Promise<AppUpdateSummary[]> {
    return this.updates.list({ channel, limit: limit ?? 20, ...(platform ? { platform } : {}) });
  }
}
