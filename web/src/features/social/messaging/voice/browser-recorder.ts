import type { UploadFile } from '../attachments/types';
import { stopAudioPlayback } from './playback';
import {
  MAX_VOICE_BYTES,
  MAX_VOICE_DURATION_MS,
  type VoiceRecorder,
  type VoiceState,
} from './types';

const FORMATS = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/ogg;codecs=opus'];

export class BrowserVoiceRecorder implements VoiceRecorder {
  private recorder?: MediaRecorder;
  private stream?: MediaStream;
  private chunks: Blob[] = [];
  private bytes = 0;
  private elapsed = 0;
  private started = 0;
  private timer?: ReturnType<typeof setInterval>;
  private disposed = false;
  private file?: UploadFile;
  private url?: string;
  private phase: VoiceState['phase'] = 'idle';
  private resolveStop?: () => void;
  private stopTimeout?: ReturnType<typeof setTimeout>;

  private readonly changed: (state: VoiceState) => void;
  constructor(changed: (state: VoiceState) => void) {
    this.changed = changed;
  }

  private publish(error?: string) {
    this.changed({
      phase: this.phase,
      durationMs: this.duration(),
      error,
      file: this.file,
      previewUrl: this.url,
    });
  }

  private duration() {
    return this.elapsed + (this.phase === 'recording' ? performance.now() - this.started : 0);
  }

  async start() {
    if (this.phase !== 'idle' || this.disposed) return;
    stopAudioPlayback();
    this.phase = 'requesting';
    this.publish();
    try {
      const mimeType =
        typeof MediaRecorder !== 'undefined'
          ? FORMATS.find((type) => MediaRecorder.isTypeSupported(type))
          : undefined;
      if (!mimeType || !navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true },
        video: false,
      });
      if (this.disposed) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.stream = stream;
      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 64_000 });
      this.recorder = recorder;
      recorder.ondataavailable = ({ data }) => {
        if (this.disposed || !data.size) return;
        this.bytes += data.size;
        if (this.bytes > MAX_VOICE_BYTES) {
          this.fail('Запис перевищив 20 МБ. Запишіть коротше повідомлення.');
          return;
        }
        this.chunks.push(data);
      };
      recorder.onerror = () => this.fail('Запис перервано. Спробуйте ще раз.');
      recorder.onstop = () => this.finished();
      stream
        .getAudioTracks()
        .forEach((track) =>
          track.addEventListener('ended', () => void this.stop(), { once: true }),
        );
      recorder.start(250);
      this.started = performance.now();
      this.phase = 'recording';
      this.timer = setInterval(() => {
        if (this.duration() >= MAX_VOICE_DURATION_MS) void this.stop();
        else this.publish();
      }, 250);
      document.addEventListener('visibilitychange', this.hidden);
      window.addEventListener('pagehide', this.hidden);
      this.publish();
    } catch (error) {
      if (this.disposed) return;
      const denied = error instanceof DOMException && error.name === 'NotAllowedError';
      this.fail(
        denied
          ? 'Немає дозволу на мікрофон. Дозвольте його в налаштуваннях браузера.'
          : 'Не вдалося відкрити мікрофон. Перевірте його доступність і підтримку запису.',
      );
    }
  }

  private hidden = () => {
    if (document.visibilityState === 'hidden' || !document.hasFocus()) void this.stop();
  };

  pause() {
    if (this.phase !== 'recording') return;
    this.elapsed = this.duration();
    this.recorder?.pause();
    this.phase = 'paused';
    this.publish();
  }

  resume() {
    if (this.phase !== 'paused') return;
    this.started = performance.now();
    this.recorder?.resume();
    this.phase = 'recording';
    this.publish();
  }

  stop(): Promise<void> {
    if (this.phase !== 'recording' && this.phase !== 'paused') return Promise.resolve();
    this.elapsed = this.duration();
    this.phase = 'stopping';
    clearInterval(this.timer);
    this.publish();
    return new Promise((resolve) => {
      this.resolveStop = resolve;
      this.stopTimeout = setTimeout(
        () => this.fail('Не вдалося завершити запис. Спробуйте ще раз.'),
        5000,
      );
      this.recorder?.stop();
    });
  }

  preview() {}

  interrupt() {
    if (this.phase === 'requesting') {
      this.disposed = true;
      this.phase = 'error';
      this.publish('Запис перервано дзвінком. Спробуйте після його завершення.');
      return;
    }
    void this.stop();
  }

  take() {
    const file = this.file;
    this.file = undefined;
    return file;
  }

  private finished() {
    clearTimeout(this.stopTimeout);
    this.releaseMicrophone();
    if (!this.disposed && this.phase !== 'error') {
      if (this.elapsed < 500 || !this.bytes)
        this.fail('Запис надто короткий. Потрібно щонайменше пів секунди.');
      else {
        const type = this.recorder!.mimeType.split(';')[0]!;
        const extension = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
        const blob = new Blob(this.chunks, { type });
        this.file = Object.assign(
          new File([blob], `Голосове-${Date.now()}.${extension}`, { type }),
          { voice: true as const },
        );
        this.url = URL.createObjectURL(blob);
        this.phase = 'ready';
        this.publish();
      }
    }
    this.chunks = [];
    this.resolveStop?.();
  }

  private releaseMicrophone() {
    clearInterval(this.timer);
    document.removeEventListener('visibilitychange', this.hidden);
    window.removeEventListener('pagehide', this.hidden);
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = undefined;
  }

  private fail(message: string) {
    clearTimeout(this.stopTimeout);
    this.phase = 'error';
    if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
    this.releaseMicrophone();
    this.chunks = [];
    this.publish(message);
    this.resolveStop?.();
  }

  dispose() {
    clearTimeout(this.stopTimeout);
    this.disposed = true;
    if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
    this.releaseMicrophone();
    if (this.url) URL.revokeObjectURL(this.url);
    this.chunks = [];
    this.file = undefined;
  }
}
