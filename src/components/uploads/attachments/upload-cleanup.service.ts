import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { Logger } from '@/globals/logger';

import { StorageProvider } from '../storage/storage.provider';
import { ChatUploadsRepository } from './repository';

const SWEEP_INTERVAL_MS = 60_000;
// Spreads each horizontally-scaled instance's tick across the interval instead
// of every replica hammering the same expired() batch and its row locks at
// once; purely a contention smoother, correctness never depends on it.
const SWEEP_JITTER_MS = 10_000;
// An attachment a message no longer references isn't purged on the spot: the
// edit/delete that dropped it and this sweep aren't the same transaction, so
// a row briefly unreferenced mid-request gets a day to pick up a new
// reference before it's actually gone. Coincidentally equals
// UPLOAD_LIFETIME_MS today; each constant is free to change independently.
const UNREFERENCED_GRACE_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class UploadCleanupService implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running = false;
  private stopped = false;

  constructor(
    private readonly repository: ChatUploadsRepository,
    private readonly storage: StorageProvider,
    private readonly logger: Logger,
  ) {}

  onModuleInit(): void {
    this.scheduleNext();
  }

  onModuleDestroy(): void {
    this.stopped = true;
    clearTimeout(this.timer);
  }

  private scheduleNext(): void {
    if (this.stopped) return;
    this.timer = setTimeout(
      () => void this.sweep().finally(() => this.scheduleNext()),
      SWEEP_INTERVAL_MS + Math.random() * SWEEP_JITTER_MS,
    );
    this.timer.unref();
  }

  async sweep(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      for (const row of await this.repository.expired()) {
        try {
          await this.purge(row.id);
        } catch (error) {
          this.logger.error({ error, uploadId: row.id }, 'Attachment cleanup failed');
        }
      }
    } catch (error) {
      this.logger.error({ error }, 'Attachment cleanup failed');
    } finally {
      this.running = false;
    }
  }

  @Transactional()
  private async purge(id: string): Promise<void> {
    const row = await this.repository.lock(id);
    if (!row || row.expiresAt.getTime() > Date.now()) return;
    if (row.state === 'attached') {
      if (await this.repository.hasLiveReferences(id)) {
        await this.repository.update(id, {
          expiresAt: new Date(Date.now() + UNREFERENCED_GRACE_MS),
        });
        return;
      }
    }
    await this.storage.abortMultipart(row.objectKey, row.multipartId);
    await this.storage.deleteObject(row.objectKey);
    await this.storage.deleteObject(`${row.objectKey}.preview.webp`);
    await this.repository.remove(id);
  }
}
