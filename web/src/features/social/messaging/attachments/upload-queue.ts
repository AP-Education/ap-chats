import { ApiError } from '@/shared/api/http';

import { beginUpload, cancelUpload, completeUpload, signUploadPart } from './attachments-api';
import { formatFileSize } from './file-presentation';
import type { AttachmentDraft, AttachmentPolicy, UploadScope, UploadSession } from './types';
import { PartUploadError, uploadPart } from './upload-part';

interface UploadJob {
  file: File;
  draft: AttachmentDraft;
  session?: UploadSession;
  completed: Set<number>;
  bytes: Map<number, number>;
  controller?: AbortController;
}

export class UploadQueue {
  private readonly jobs = new Map<string, UploadJob>();
  private readonly active = new Set<string>();
  private listeners = new Set<() => void>();
  private snapshot: AttachmentDraft[] = [];
  private disposed = false;
  private token: string | undefined;

  private readonly scope: UploadScope;
  constructor(scope: UploadScope) {
    this.scope = scope;
  }

  setToken(token: string | undefined): void {
    this.token = token;
  }
  activate(): void {
    this.disposed = false;
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  add(files: File[], policy: AttachmentPolicy): string[] {
    const errors: string[] = [];
    let total = this.snapshot.reduce((sum, item) => sum + item.size, 0);
    for (const file of files) {
      let error: string | undefined;
      if (this.jobs.size >= policy.maxFiles) error = `До ${policy.maxFiles} файлів у повідомленні`;
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
      const key = crypto.randomUUID();
      const previewUrl =
        /^(image\/(jpeg|png|webp|gif))$/.test(file.type) && file.size <= 20 * 1024 * 1024
          ? URL.createObjectURL(file)
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
    if (job.draft.previewUrl) URL.revokeObjectURL(job.draft.previewUrl);
    if (job.session && this.token)
      void cancelUpload(this.token, this.scope, job.session.id).catch(() => undefined);
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

  takeReady(): AttachmentDraft[] {
    if (!this.snapshot.length || this.snapshot.some((item) => item.status !== 'ready')) return [];
    const ready = this.snapshot;
    for (const job of this.jobs.values())
      if (job.draft.previewUrl) URL.revokeObjectURL(job.draft.previewUrl);
    this.jobs.clear();
    this.publish();
    return ready;
  }

  dispose(): void {
    this.disposed = true;
    for (const key of this.jobs.keys()) this.remove(key);
  }

  private publish(): void {
    this.snapshot = [...this.jobs.values()].map((job) => job.draft);
    for (const listener of this.listeners) listener();
  }

  private tokenOrThrow(): string {
    if (!this.token) throw new Error('Sign in to upload');
    return this.token;
  }

  private pump(): void {
    if (this.disposed) return;
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
      job.session ??= await beginUpload(this.tokenOrThrow(), this.scope, job.file);
      if (controller.signal.aborted) {
        void cancelUpload(this.tokenOrThrow(), this.scope, job.session.id).catch(() => undefined);
        return;
      }
      const session = job.session;
      const remaining = Array.from(
        { length: Math.ceil(job.file.size / session.partBytes) },
        (_, index) => index + 1,
      ).filter((number) => !job.completed.has(number));
      const sendPart = async () => {
        while (remaining.length && !controller.signal.aborted) {
          const number = remaining.shift()!;
          const part = job.file.slice(
            (number - 1) * session.partBytes,
            Math.min(number * session.partBytes, job.file.size),
          );
          for (let attempt = 0; ; attempt++) {
            try {
              job.bytes.set(number, 0);
              const { url } = await signUploadPart(
                this.tokenOrThrow(),
                this.scope,
                session.id,
                number,
              );
              await uploadPart(url, part, controller.signal, (bytes) => {
                job.bytes.set(number, bytes);
                const sent = [...job.bytes.values()].reduce((sum, value) => sum + value, 0);
                update({ progress: Math.min(99, Math.floor((sent / job.file.size) * 100)) });
              });
              job.completed.add(number);
              break;
            } catch (error) {
              if (
                controller.signal.aborted ||
                attempt >= 2 ||
                (error instanceof ApiError && error.status < 500) ||
                (error instanceof PartUploadError &&
                  error.status > 0 &&
                  error.status < 500 &&
                  error.status !== 403)
              )
                throw error;
              await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
              if (controller.signal.aborted) throw error;
            }
          }
        }
      };
      // Wait for both workers before freeing the queue slot, including after failure.
      let firstFailure: unknown;
      const worker = () =>
        sendPart().catch((error) => {
          firstFailure ??= error;
          controller.abort();
          throw error;
        });
      const workers = await Promise.allSettled([worker(), worker()]);
      const failure = workers.find((result) => result.status === 'rejected');
      if (failure?.status === 'rejected') throw firstFailure;
      if (controller.signal.aborted) return;
      update({ status: 'processing', progress: 100 });
      const attachment = await completeUpload(this.tokenOrThrow(), this.scope, session.id);
      update({ status: 'ready', attachment });
    } catch (error) {
      if (!this.jobs.has(key)) return;
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
