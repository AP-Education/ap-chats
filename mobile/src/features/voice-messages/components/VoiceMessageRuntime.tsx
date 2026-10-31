import {
  AudioModule,
  type AudioPlayer,
  createAudioPlayer,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { randomUUID } from 'expo-crypto';
import { File } from 'expo-file-system';
import { type Ref, useEffect, useImperativeHandle, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { useAuthStore } from '../../auth';
import { useNativeCallStore } from '../../calls/store/native-call-store';
import { type VoiceRequest, type VoiceStateMessage, type VoiceUploadResult } from '../types';
import { VoiceAudioMode } from '../utils/audio-mode';
import {
  cancelRecordingUpload,
  type RecordingUpload,
  uploadRecording,
} from '../utils/upload-recording';
import { VoiceSession } from '../utils/voice-session';

const VOICE_OPTIONS = { ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1, bitRate: 64_000 };
const audioMode = new VoiceAudioMode(
  (allowsRecording) =>
    setAudioModeAsync({ allowsRecording, playsInSilentMode: true, shouldPlayInBackground: false }),
  () => Boolean(useNativeCallStore.getState().call),
);

export interface VoiceRuntimeHandle {
  handle(message: VoiceRequest): void;
  reset(): void;
}

export function VoiceMessageRuntime({
  ref,
  send,
}: {
  ref: Ref<VoiceRuntimeHandle>;
  send: (message: VoiceStateMessage | VoiceUploadResult) => void;
}) {
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  }, [send]);
  const uploads = useRef(new Map<string, RecordingUpload>());
  const requests = useRef(new Map<string, { controller: AbortController; recordingId: string }>());
  const playback = useRef<AudioPlayer | null>(null);
  const session = useRef<VoiceSession | null>(null);
  useEffect(() => {
    session.current = new VoiceSession({
      now: () => performance.now(),
      randomId: randomUUID,
      canRecord: () => !useNativeCallStore.getState().call && AppState.currentState === 'active',
      emit: (state) => sendRef.current(state),
      retain: (recording) => uploads.current.set(recording.id, { recording, completed: new Set() }),
      remove: (uri) => {
        for (const [id, upload] of uploads.current)
          if (upload.recording.uri === uri) uploads.current.delete(id);
        try {
          const file = new File(uri);
          if (file.exists) file.delete();
        } catch {
          /* Cache eviction may have already removed the file. */
        }
      },
      createDriver: () => {
        const recorder = new AudioModule.AudioRecorder({
          ...VOICE_OPTIONS,
          ...(Platform.OS === 'android' ? VOICE_OPTIONS.android : VOICE_OPTIONS.ios),
        });
        const audio = audioMode.acquire();
        let disposed = false;
        let completed = false;
        const subscription = recorder.addListener('recordingStatusUpdate', (status) => {
          if (!completed && (status.hasError || status.mediaServicesDidReset || status.isFinished))
            session.current?.interrupt();
        });
        return {
          prepare: async () => {
            const permission = await requestRecordingPermissionsAsync();
            if (!permission.granted)
              throw new Error('Немає дозволу на мікрофон. Дозвольте його в налаштуваннях AP App.');
            if (disposed) return;
            await audio.enable();
            if (disposed) return;
            await recorder.prepareToRecordAsync(VOICE_OPTIONS);
          },
          record: () => recorder.record(),
          pause: () => recorder.pause(),
          stop: async () => {
            completed = true;
            await recorder.stop();
            if (!recorder.uri) throw new Error('Запис не збережено.');
            const file = new File(recorder.uri);
            return { uri: recorder.uri, size: file.size };
          },
          dispose: () => {
            if (disposed) return;
            disposed = true;
            subscription.remove();
            const uri = recorder.uri;
            recorder.release();
            if (!completed && uri) {
              try {
                const file = new File(uri);
                if (file.exists) file.delete();
              } catch {
                /* An interrupted recorder may have removed it. */
              }
            }
            void audio.release().catch(() => undefined);
          },
        };
      },
    });
    return () => {
      const id = session.current?.getSessionId();
      if (id) session.current?.cancel(id);
    };
  }, []);

  function stopPlayback() {
    playback.current?.pause();
    playback.current?.remove();
    playback.current = null;
  }

  function release(id: string, cancelUpload = true) {
    for (const request of requests.current.values())
      if (request.recordingId === id) request.controller.abort();
    const upload = uploads.current.get(id);
    if (!upload) return;
    // Attached uploads reject cancellation, so this also safely handles a completed send.
    if (cancelUpload) cancelRecordingUpload(upload);
    try {
      const file = new File(upload.recording.uri);
      if (file.exists) file.delete();
    } catch {
      /* Best-effort cleanup of an app cache file. */
    }
    uploads.current.delete(id);
  }

  function reset() {
    stopPlayback();
    const id = session.current?.getSessionId();
    if (id) session.current?.cancel(id);
    for (const id of [...uploads.current.keys()]) release(id);
  }

  async function upload(message: Extract<VoiceRequest, { type: 'voice/upload' }>) {
    const file = uploads.current.get(message.recordingId);
    if (!file || requests.current.has(message.requestId)) {
      sendRef.current({
        type: 'voice/upload-result',
        requestId: message.requestId,
        error: 'Локальний запис недоступний. Запишіть повідомлення ще раз.',
      });
      return;
    }
    const controller = new AbortController();
    requests.current.set(message.requestId, { controller, recordingId: message.recordingId });
    try {
      const result = await uploadRecording(file, message, controller.signal, (bytes) => {
        if (!controller.signal.aborted)
          sendRef.current({ type: 'voice/upload-result', requestId: message.requestId, bytes });
      });
      if (!controller.signal.aborted)
        sendRef.current({ type: 'voice/upload-result', requestId: message.requestId, ...result });
    } catch (error) {
      if (!controller.signal.aborted)
        sendRef.current({
          type: 'voice/upload-result',
          requestId: message.requestId,
          error: error instanceof Error ? error.message : 'Не вдалося завантажити голосове.',
        });
    } finally {
      requests.current.delete(message.requestId);
    }
  }

  useImperativeHandle(ref, () => ({
    reset,
    handle(message) {
      const current = session.current!;
      if (message.type === 'voice/start') {
        stopPlayback();
        void current.start(message.sessionId, message);
      } else if (message.type === 'voice/pause') current.pause(message.sessionId);
      else if (message.type === 'voice/resume') current.resume(message.sessionId);
      else if (message.type === 'voice/stop') void current.stop(message.sessionId);
      else if (message.type === 'voice/cancel') {
        stopPlayback();
        current.cancel(message.sessionId, message.keepRecording);
      } else if (message.type === 'voice/release')
        release(message.recordingId, message.cancelUpload === true);
      else if (message.type === 'voice/upload') void upload(message);
      else if (message.type === 'voice/upload-cancel')
        requests.current.get(message.requestId)?.controller.abort();
      else if (message.type === 'voice/preview') {
        const recording = current.getRecording(message.sessionId);
        if (!recording || useNativeCallStore.getState().call) return;
        if (playback.current?.playing) {
          playback.current.pause();
        } else {
          if (!playback.current) {
            // Pausing a preview must not schedule session deactivation over the next recording.
            playback.current = createAudioPlayer(recording.uri, { keepAudioSessionActive: true });
            playback.current.addListener('playbackStatusUpdate', (status) =>
              sendRef.current({
                type: 'voice/state',
                sessionId: message.sessionId,
                phase: 'ready',
                durationMs: recording.durationMs,
                playing: status.playing,
              }),
            );
          }
          if (playback.current.currentTime >= playback.current.duration)
            void playback.current.seekTo(0).then(() => playback.current?.play());
          else playback.current.play();
        }
      }
    },
  }));

  useEffect(() => {
    const app = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        stopPlayback();
        session.current?.interrupt();
      }
    });
    const call = useNativeCallStore.subscribe((state) => {
      if (state.call) {
        stopPlayback();
        session.current?.interrupt();
      }
    });
    const auth = useAuthStore.subscribe((state) => {
      if (state.status !== 'signed-in' && state.status !== 'unconfigured') reset();
    });
    return () => {
      app.remove();
      call();
      auth();
      reset();
    };
    // The runtime is mounted once beside the WebView; all mutable handles live in refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
