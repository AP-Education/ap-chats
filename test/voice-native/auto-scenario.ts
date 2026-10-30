import { Platform } from 'react-native';

import type { VoiceRuntimeHandle } from '../../mobile/src/features/voice-messages/components/VoiceMessageRuntime';
import type {
  VoiceStateMessage,
  VoiceUploadResult,
} from '../../mobile/src/features/voice-messages/types';

const scope = {
  workspaceId: '10000000-0000-4000-8000-000000000001',
  channelId: '20000000-0000-4000-8000-000000000001',
};

/** Runs the production Expo recorder and uploader with disposable QA auth and API. */
export class NativeVoiceScenario {
  private phase = 'starting';
  private recordingId?: string;
  private readonly checks: string[] = [];
  private timer?: ReturnType<typeof setTimeout>;
  constructor(
    private readonly runtime: () => VoiceRuntimeHandle | null,
    private readonly completed: () => void,
  ) {}

  start() {
    this.timer = setTimeout(
      () => void this.report({ error: 'Native recording scenario timed out' }),
      90_000,
    );
    this.runtime()?.handle({ type: 'voice/start', sessionId: 'native-qa', ...scope });
  }

  receive(message: VoiceStateMessage | VoiceUploadResult) {
    if (message.type === 'voice/state') {
      if (message.sessionId !== 'native-qa') return;
      if (message.error) {
        void this.report({ error: message.error });
        return;
      }
      if (
        message.phase === 'recording' &&
        message.durationMs >= 1250 &&
        this.phase === 'starting'
      ) {
        this.phase = 'pausing';
        this.checks.push('native microphone capture');
        this.runtime()?.handle({ type: 'voice/pause', sessionId: 'native-qa' });
      } else if (message.phase === 'paused' && this.phase === 'pausing') {
        this.phase = 'resuming';
        this.checks.push('native pause');
        setTimeout(() => {
          this.phase = 'resumed';
          this.runtime()?.handle({ type: 'voice/resume', sessionId: 'native-qa' });
        }, 500);
      } else if (
        message.phase === 'recording' &&
        message.durationMs >= 2500 &&
        this.phase === 'resumed'
      ) {
        this.phase = 'stopping';
        this.checks.push('native resume');
        this.runtime()?.handle({ type: 'voice/stop', sessionId: 'native-qa' });
      } else if (message.phase === 'ready' && message.recording && this.phase === 'stopping') {
        this.phase = 'preview';
        this.recordingId = message.recording.id;
        this.checks.push('native AAC file finalization');
        this.runtime()?.handle({ type: 'voice/preview', sessionId: 'native-qa' });
      } else if (message.phase === 'ready' && message.playing && this.phase === 'preview') {
        this.phase = 'wrong-scope';
        this.checks.push('native preview playback');
        this.runtime()?.handle({ type: 'voice/preview', sessionId: 'native-qa' });
        this.runtime()?.handle({
          type: 'voice/upload',
          recordingId: this.recordingId!,
          requestId: 'wrong-scope',
          ...scope,
          channelId: '20000000-0000-4000-8000-000000000002',
        });
      }
    } else if (
      message.requestId === 'wrong-scope' &&
      message.error &&
      this.phase === 'wrong-scope'
    ) {
      this.phase = 'upload';
      this.checks.push('cross-conversation upload rejected');
      this.runtime()?.handle({
        type: 'voice/upload',
        recordingId: this.recordingId!,
        requestId: 'native-upload',
        ...scope,
      });
    } else if (
      message.requestId === 'native-upload' &&
      message.attachment &&
      this.phase === 'upload'
    ) {
      this.phase = 'complete';
      this.checks.push('native multipart upload', 'server parses native AAC recording');
      this.runtime()?.handle({
        type: 'voice/release',
        recordingId: this.recordingId!,
        cancelUpload: false,
      });
      this.runtime()?.handle({ type: 'voice/cancel', sessionId: 'native-qa', keepRecording: true });
      void this.report({ attachment: message.attachment });
    } else if (message.requestId === 'native-upload' && message.error)
      void this.report({ error: message.error });
  }

  private async report(result: { error?: string; attachment?: Record<string, unknown> }) {
    clearTimeout(this.timer);
    this.phase = 'reported';
    if (result.error) this.runtime()?.reset();
    const host = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
    await fetch(`http://${host}:5572/api/qa-result`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer fixture-only' },
      body: JSON.stringify({ platform: Platform.OS, checks: this.checks, ...result }),
    });
    if (result.attachment) this.completed();
  }
}
