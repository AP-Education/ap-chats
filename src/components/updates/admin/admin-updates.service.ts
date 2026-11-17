import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { Logger } from '@/globals/logger';

import { UpdatesRepository } from '../repository';
import type { AppUpdateSummary, RollbackResult, StoredAppUpdate } from '../types';
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

  async setRollout(id: string, percent: number): Promise<void> {
    await this.requireLive(id);
    await this.updates.setRollout(id, percent);
    this.logger.info({ updateId: id, percent }, 'Update rollout changed');
  }

  /** Stops new phones from taking the update; phones that already run it keep it. */
  async pause(id: string): Promise<void> {
    await this.requireLive(id);
    await this.updates.setStatus(id, 'paused');
    this.logger.info({ updateId: id }, 'Update paused');
  }

  /**
   * Phones keep the newest update they have, so serving an older one would not move them. The
   * previous bundle is published again as a new update, or phones are told to return to the
   * embedded one, and the bad update is revoked for good.
   */
  async rollback(id: string, embedded = false): Promise<RollbackResult> {
    const result = await this.replace(id, embedded);
    this.logger.warn({ updateId: id, ...result }, 'Update rolled back');
    return result;
  }

  @Transactional()
  private async replace(id: string, embedded: boolean): Promise<RollbackResult> {
    const bad = await this.requireLive(id);
    if (bad.kind !== 'update')
      throw new ConflictException('A rollback is undone by publishing a new update');

    const previous = embedded ? undefined : await this.updates.findPreviousBundle(bad);
    const target = {
      platform: bad.platform,
      channel: bad.channel,
      runtimeVersion: bad.runtimeVersion,
    };
    const details = { gitCommit: null, notes: `Rollback of ${bad.id}`, createdBy: 'rollback' };
    const replacement = previous?.manifest
      ? {
          ...target,
          ...details,
          kind: 'update' as const,
          manifest: previous.manifest,
          // Phones that took the bad update should leave it as soon as nothing would be lost.
          mandatory: true,
          sourceUpdateId: previous.id,
        }
      : {
          ...target,
          ...details,
          kind: 'rollback_to_embedded' as const,
          manifest: null,
          mandatory: false,
          sourceUpdateId: null,
        };

    const newId = await this.updates.create({ ...replacement, rolloutPercent: 100 });
    await this.updates.setStatus(bad.id, 'revoked');
    return { id: newId, kind: replacement.kind, sourceUpdateId: replacement.sourceUpdateId };
  }

  private async requireLive(id: string): Promise<StoredAppUpdate> {
    const update = await this.updates.find(id);
    if (!update) throw new NotFoundException('Update not found');
    if (update.status === 'revoked') throw new ConflictException('Update is already revoked');
    return update;
  }
}
