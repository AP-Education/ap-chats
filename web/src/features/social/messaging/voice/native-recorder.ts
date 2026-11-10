import { onNativeMessage, postToNative } from '@ap-education/shell-sdk';

import { randomId } from '@/shared/lib/random-id';

import type { Attachment, UploadFile, UploadScope, UploadSession } from '../attachments/types';
import { stopAudioPlayback } from './playback';
import type { VoiceRecorder, VoiceState } from './types';

interface NativeVoiceState {
  type: 'voice/state';
  sessionId: string;
  phase: VoiceState['phase'];
  durationMs: number;
  error?: string;
  playing?: boolean;
  recording?: { id: string; name: string; size: number };
}

export class NativeVoiceRecorder implements VoiceRecorder {
  private readonly id = randomId();
  private file?: UploadFile;
  private transferred = false;
  private unsubscribe: () => void = () => undefined;
  private timeout?: ReturnType<typeof setTimeout>;

  private readonly changed: (state: VoiceState) => void;
  private readonly scope: UploadScope;
  constructor(changed: (state: VoiceState) => void, scope: UploadScope) {
    this.changed = changed;
    this.scope = scope;
  }

  private listen() {
    this.unsubscribe = onNativeMessage<NativeVoiceState>((message) => {
      if (message?.type !== 'voice/state' || message.sessionId !== this.id) return;
      clearTimeout(this.timeout);
      if (message.recording) {
        const { id, name, size } = message.recording;
        this.file = {
          name,
          size,
          type: 'audio/mp4',
          lastModified: Date.now(),
          voice: true,
          nativeRecordingId: id,
          slice: () => {
            throw new Error('Native files stay on the device');
          },
        };
      }
      this.changed({
        phase: message.phase,
        durationMs: message.durationMs,
        error: message.error,
        file: this.file,
        playing: message.playing,
      });
    });
  }

  async start() {
    stopAudioPlayback();
    this.listen();
    this.changed({ phase: 'requesting', durationMs: 0 });
    this.timeout = setTimeout(() => {
      postToNative({ type: 'voice/cancel', sessionId: this.id });
      this.changed({
        phase: 'error',
        durationMs: 0,
        error: 'Запис недоступний у цій версії застосунку. Оновіть AP App.',
      });
    }, 15_000);
    postToNative({ type: 'voice/start', sessionId: this.id, ...this.scope });
  }

  pause() {
    postToNative({ type: 'voice/pause', sessionId: this.id });
  }
  resume() {
    postToNative({ type: 'voice/resume', sessionId: this.id });
  }
  async stop() {
    postToNative({ type: 'voice/stop', sessionId: this.id });
  }
  preview() {
    stopAudioPlayback();
    postToNative({ type: 'voice/preview', sessionId: this.id });
  }
  take() {
    this.transferred = true;
    return this.file;
  }
  dispose() {
    clearTimeout(this.timeout);
    this.unsubscribe();
    postToNative({ type: 'voice/cancel', sessionId: this.id, keepRecording: this.transferred });
  }
}

export function releaseNativeVoice(recordingId: string, cancelUpload = false) {
  postToNative({ type: 'voice/release', recordingId, cancelUpload });
}

export function uploadNativeVoice(
  recordingId: string,
  scope: UploadScope,
  signal: AbortSignal,
  progress: (bytes: number) => void,
): Promise<{ session: UploadSession; attachment: Attachment }> {
  return new Promise((resolve, reject) => {
    const requestId = randomId();
    const finish = () => {
      clearTimeout(timer);
      unsubscribe();
      signal.removeEventListener('abort', abort);
    };
    const abort = () => {
      postToNative({ type: 'voice/upload-cancel', requestId });
      finish();
      reject(new DOMException('Upload cancelled', 'AbortError'));
    };
    const timer = setTimeout(() => {
      postToNative({ type: 'voice/upload-cancel', requestId });
      finish();
      reject(new Error('Voice upload timed out'));
    }, 180_000);
    const unsubscribe = onNativeMessage<{
      type: string;
      requestId: string;
      bytes?: number;
      error?: string;
      session?: UploadSession;
      attachment?: Attachment;
    }>((message) => {
      if (message?.type !== 'voice/upload-result' || message.requestId !== requestId) return;
      if (message.error) {
        finish();
        reject(new Error(message.error));
      } else if (message.session && message.attachment) {
        finish();
        resolve({ session: message.session, attachment: message.attachment });
      } else if (typeof message.bytes === 'number') progress(message.bytes);
    });
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener('abort', abort, { once: true });
    postToNative({ type: 'voice/upload', requestId, recordingId, ...scope });
  });
}
