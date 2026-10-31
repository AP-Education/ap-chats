import { ApiError } from '@/shared/api/http';
import { randomId } from '@/shared/lib/random-id';

import { releaseNativeVoice } from '../voice/native-recorder';
import { formatFileSize } from './file-presentation';
import { MultipartUploader, type UploadResumeState } from './multipart-uploader';
import type { AttachmentDraft, AttachmentPolicy, UploadFile, UploadScope } from './types';

interface UploadJob extends UploadResumeState {
  file: UploadFile;
  draft: AttachmentDraft;
  controller?: AbortController;
  /** Set once a send commits this job: it keeps uploading, but drops out of the composer's own snapshot. */
  committedTo?: string;
}

export class UploadQueue {
  private readonly jobs = new Map<string, UploadJob>();
  private readonly active = new Set<string>();
  private listeners = new Set<() => void>();
  private snapshot: AttachmentDraft[] = [];

  private readonly token: () => string | undefined;
  private readonly uploader: MultipartUploader;
  constructor(scope: UploadScope, token: () => string | undefined) {
    this.token = token;
    this.uploader = new MultipartUploader(() => this.tokenOrThrow(), scope);
  }

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  add(files: UploadFile[], policy: AttachmentPolicy): string[] {
    const errors: string[] = [];
    // Committed jobs belong to a message already on its way out, not this
    // one in progress — they shouldn't count against its own limits.
    let visibleCount = this.snapshot.length;
    let total = this.snapshot.reduce((sum, item) => sum + item.size, 0);
    for (const file of files) {
      let error: string | undefined;
      if (visibleCount >= policy.maxFiles) error = `До ${policy.maxFiles} файлів у повідомленні`;
      else if (!file.size) error = `${file.name}: файл порожній`;
      else if (file.size > policy.maxFileBytes)
        error = `${file.name}: ліміт ${formatFileSize(policy.maxFileBytes)} на файл`;
      else if (total + file.size > policy.maxMessageBytes)
        error = `Загальний розмір перевищує ${formatFileSize(policy.maxMessageBytes)}`;
      if (error) {
        errors.push(error);
        continue;
      }
      if (
        [...this.jobs.values()].some(
          (job) =>
            job.file.name === file.name &&
            job.file.size === file.size &&
            job.file.lastModified === file.lastModified,
        )
      )
        continue;
      const key = randomId();
      const previewUrl =
        /^(image\/(jpeg|png|webp|gif))$/.test(file.type) && file.size <= 20 * 1024 * 1024
          ? URL.createObjectURL(file as File)
          : undefined;
      const draft: AttachmentDraft = {
        key,
        name: file.name,
        size: file.size,
        status: 'queued',
        progress: 0,
        description: '',
        ...(previewUrl ? { previewUrl } : {}),
      };
      this.jobs.set(key, { file, draft, completed: new Set(), bytes: new Map() });
      visibleCount += 1;
      total += file.size;
    }
    this.publish();
    this.pump();
    return [...new Set(errors)];
  }

  remove(key: string): void {
    const job = this.jobs.get(key);
    if (!job) return;
    this.jobs.delete(key);
    job.controller?.abort();
    if (job.file.nativeRecordingId) releaseNativeVoice(job.file.nativeRecordingId, true);
    if (job.draft.previewUrl) URL.revokeObjectURL(job.draft.previewUrl);
    this.uploader.cancel(this.token(), job.session);
    this.publish();
  }

  retry(key: string): void {
    const job = this.jobs.get(key);
    if (!job || job.draft.status !== 'error') return;
    if (job.session && Date.parse(job.session.expiresAt) <= Date.now()) {
      delete job.session;
      job.completed.clear();
      job.bytes.clear();
    }
    job.draft = { ...job.draft, status: 'queued', error: undefined };
    this.publish();
    this.pump();
  }

  describe(key: string, description: string): void {
    const job = this.jobs.get(key);
    if (!job) return;
    job.draft = { ...job.draft, description };
    this.publish();
  }

  /**
   * Commits every non-failed draft to a send: sending never waits on upload
   * completion (matches Discord/Telegram/Slack/WhatsApp), so this hands back
   * whatever state they're currently in — queued, uploading or already ready
   * — while they keep running in pump()/run(). A failed draft is left
   * uncommitted so it stays visible (and retryable) in the composer, and a
   * draft an earlier send took stays with that message.
   */
  commit(clientNonce: string): AttachmentDraft[] {
    const committed: AttachmentDraft[] = [];
    for (const job of this.jobs.values()) {
      if (job.committedTo || job.draft.status === 'error') continue;
      job.committedTo = clientNonce;
      committed.push(job.draft);
    }
    this.publish();
    return committed;
  }

  getCommitted(clientNonce: string): AttachmentDraft[] {
    return [...this.jobs.values()]
      .filter((job) => job.committedTo === clientNonce)
      .map((job) => job.draft);
  }

  /** The commit's files are all uploaded and handed to its message: stop tracking them here. */
  releaseCommitted(clientNonce: string): void {
    for (const [key, job] of this.jobs) {
      if (job.committedTo !== clientNonce) continue;
      if (job.draft.previewUrl) URL.revokeObjectURL(job.draft.previewUrl);
      if (job.file.nativeRecordingId) releaseNativeVoice(job.file.nativeRecordingId);
      this.jobs.delete(key);
    }
    this.publish();
  }

  /** Stops every upload, sent or not: the conversation's queue is going away, as on sign-out. */
  dispose(): void {
    for (const key of [...this.jobs.keys()]) this.remove(key);
  }

  private publish(): void {
    this.snapshot = [...this.jobs.values()]
      .filter((job) => !job.committedTo)
      .map((job) => job.draft);
    for (const listener of this.listeners) listener();
  }

  private tokenOrThrow(): string {
    const token = this.token();
    if (!token) throw new Error('Sign in to upload');
    return token;
  }

  private pump(): void {
    for (const [key, job] of this.jobs) {
      if (this.active.size >= 2) return;
      if (job.draft.status !== 'queued' || this.active.has(key)) continue;
      this.active.add(key);
      void this.run(key, job).finally(() => {
        this.active.delete(key);
        this.pump();
      });
    }
  }

  private async run(key: string, job: UploadJob): Promise<void> {
    const controller = new AbortController();
    job.controller = controller;
    const update = (patch: Partial<AttachmentDraft>) => {
      if (!this.jobs.has(key)) return;
      job.draft = { ...job.draft, ...patch };
      this.publish();
    };
    update({ status: 'uploading' });
    try {
      const result = await this.uploader.upload(job.file, job, controller.signal, {
        onProgress: (sent) =>
          update({ progress: Math.min(99, Math.floor((sent / job.file.size) * 100)) }),
        onProcessing: () => update({ status: 'processing', progress: 100 }),
      });
      job.session = result.session;
      update({ status: 'ready', attachment: result.attachment });
    } catch (error) {
      if (!this.jobs.has(key) || controller.signal.aborted) return;
      if (error instanceof ApiError && error.status === 404) {
        delete job.session;
        job.completed.clear();
        job.bytes.clear();
      }
      update({
        status: 'error',
        error:
          error instanceof ApiError && error.status === 404
            ? 'Час завантаження минув. Спробуйте ще раз.'
            : 'Не вдалося завантажити. Перевірте з’єднання й повторіть.',
      });
    }
  }
}
