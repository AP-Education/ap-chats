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
    const id = await this.create(dto);
    this.logger.info(
      { updateId: id, platform: dto.platform, channel: dto.channel, gitCommit: dto.gitCommit },
      'Update published',
    );
    return { id };
  }

  /**
   * A newer bundle supersedes a rollback: that is how a fix ships. The bundle that was rolled
   * back never comes back this way, even from a publish that started before the rollback.
   */
  @Transactional()
  private async create(dto: PublishUpdateDto): Promise<string> {
    if (!(await this.updates.hasRuntime(dto.platform, dto.runtimeVersion)))
      throw new ConflictException(
        'No store build ships this runtime: its native code changed, so it needs a store release',
      );
    const target = {
      platform: dto.platform,
      channel: dto.channel,
      runtimeVersion: dto.runtimeVersion,
    };
    // Waits for a rollback of the same target, so its revocation is seen below.
    await this.updates.lockTarget(target);
    if (await this.updates.isRevokedBundle(target, dto.manifest.launchAsset.hash))
      throw new ConflictException('This bundle was rolled back; publish a fixed one');

    return this.updates.create({
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
  }

  list({ channel, platform, limit }: ListUpdatesQueryDto): Promise<AppUpdateSummary[]> {
    return this.updates.list({ channel, limit: limit ?? 20, ...(platform ? { platform } : {}) });
  }

  /**
   * A paused update stays paused unless `resume` says otherwise, so a rollout change that was
   * asked for before an emergency pause cannot undo it.
   */
  async setRollout(id: string, percent: number, resume = false): Promise<void> {
    const update = await this.requireLive(id);
    if (update.status === 'paused' && !resume) throw stillPaused();
    // Paused or revoked between the read and the write: the write itself refuses it.
    if (!(await this.updates.setRollout(id, percent, resume)))
      throw resume ? alreadyRevoked() : stillPaused();
    this.logger.info({ updateId: id, percent, resume }, 'Update rollout changed');
  }

  /** Stops new phones from taking the update; phones that already run it keep it. */
  async pause(id: string): Promise<void> {
    await this.requireLive(id);
    if (!(await this.updates.setStatus(id, 'paused'))) throw alreadyRevoked();
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
    const found = await this.requireLive(id);
    // One rollback or publish per target at a time: the next one reads what this one wrote, so
    // it can neither pick a bundle this one revoked nor republish it.
    await this.updates.lockTarget({
      platform: found.platform,
      channel: found.channel,
      runtimeVersion: found.runtimeVersion,
    });
    const bad = await this.requireLive(id);
    if (bad.kind !== 'update')
      throw new ConflictException('A rollback is undone by publishing a new update');
    // Revoking first claims the update: of two rollbacks at once, the second waits on the row
    // and then finds it revoked, so only one replacement is ever made.
    if (!(await this.updates.setStatus(bad.id, 'revoked'))) throw alreadyRevoked();

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
    return { id: newId, kind: replacement.kind, sourceUpdateId: replacement.sourceUpdateId };
  }

  private async requireLive(id: string): Promise<StoredAppUpdate> {
    const update = await this.updates.find(id);
    if (!update) throw new NotFoundException('Update not found');
    if (update.status === 'revoked') throw alreadyRevoked();
    return update;
  }
}

function alreadyRevoked(): ConflictException {
  return new ConflictException('Update is already revoked');
}

function stillPaused(): ConflictException {
  return new ConflictException('Update is paused: resume it to change its rollout');
}
