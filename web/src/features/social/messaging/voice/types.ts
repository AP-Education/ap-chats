import type { UploadFile } from '../attachments/types';

export type VoiceGestureMode = 'holding' | 'cancelling' | 'locking' | 'locked';

export type VoicePhase =
  'idle' | 'requesting' | 'recording' | 'paused' | 'stopping' | 'ready' | 'error';

export interface VoiceState {
  phase: VoicePhase;
  durationMs: number;
  error?: string;
  previewUrl?: string;
  file?: UploadFile;
  playing?: boolean;
}

export interface VoiceRecorder {
  start(): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): Promise<void>;
  preview(): void;
  take(): UploadFile | undefined;
  dispose(): void;
}

export const MAX_VOICE_DURATION_MS = 10 * 60 * 1000;
export const MAX_VOICE_BYTES = 20 * 1024 * 1024;

export function voiceTime(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
