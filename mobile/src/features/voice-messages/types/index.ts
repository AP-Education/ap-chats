export interface VoiceScope {
  workspaceId: string;
  channelId: string;
}

export type VoiceRequest =
  | ({ type: 'voice/start'; sessionId: string } & VoiceScope)
  | { type: 'voice/pause' | 'voice/resume' | 'voice/stop' | 'voice/preview'; sessionId: string }
  | { type: 'voice/cancel'; sessionId: string; keepRecording?: boolean }
  | { type: 'voice/release'; recordingId: string; cancelUpload?: boolean }
  | ({ type: 'voice/upload'; recordingId: string; requestId: string } & VoiceScope)
  | { type: 'voice/upload-cancel'; requestId: string };

export interface VoiceStateMessage {
  type: 'voice/state';
  sessionId: string;
  phase: 'requesting' | 'recording' | 'paused' | 'stopping' | 'ready' | 'error';
  durationMs: number;
  error?: string;
  playing?: boolean;
  recording?: { id: string; name: string; size: number };
}

export interface VoiceUploadResult {
  type: 'voice/upload-result';
  requestId: string;
  bytes?: number;
  error?: string;
  session?: { id: string; partBytes: number; expiresAt: string };
  attachment?: Record<string, unknown>;
}

export function isVoiceRequest(value: unknown): value is VoiceRequest {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  if (typeof message.type !== 'string') return false;
  const id = (key: string) =>
    typeof message[key] === 'string' &&
    (message[key] as string).length > 0 &&
    (message[key] as string).length <= 200;
  if (message.type === 'voice/release') return id('recordingId');
  if (message.type === 'voice/upload-cancel') return id('requestId');
  if (message.type === 'voice/upload')
    return id('requestId') && id('recordingId') && id('workspaceId') && id('channelId');
  if (!id('sessionId')) return false;
  if (message.type === 'voice/start') return id('workspaceId') && id('channelId');
  if (message.type === 'voice/cancel')
    return message.keepRecording === undefined || typeof message.keepRecording === 'boolean';
  return ['voice/pause', 'voice/resume', 'voice/stop', 'voice/preview'].includes(message.type);
}
