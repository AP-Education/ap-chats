import { isNativeShell } from '@ap-education/shell-sdk';
import { IconButton } from '@ap-education/ui';
import { MicrophoneIcon, PauseIcon, PlayIcon, StopIcon } from '@phosphor-icons/react';
import { Button } from 'antd';
import { useEffect, useRef, useState } from 'react';

import { AdaptiveModal } from '@/shared/ui/AdaptiveModal';

import type { UploadFile, UploadScope } from '../attachments/types';
import { BrowserVoiceRecorder } from './browser-recorder';
import { NativeVoiceRecorder } from './native-recorder';
import { claimAudioPlayback } from './playback';
import { type VoiceRecorder, type VoiceState, voiceTime } from './types';
import styles from './VoiceComposer.module.css';

export function VoiceComposer({
  scope,
  disabled,
  visible = true,
  onSend,
}: {
  scope: UploadScope;
  disabled: boolean;
  visible?: boolean;
  onSend: (file: UploadFile) => boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {visible && (
        <IconButton
          size={44}
          aria-label="Записати голосове повідомлення"
          disabled={disabled}
          onClick={() => setOpen(true)}
        >
          <MicrophoneIcon size={23} />
        </IconButton>
      )}
      {open && <VoiceRecording scope={scope} onCancel={() => setOpen(false)} onSend={onSend} />}
    </>
  );
}

function VoiceRecording({
  scope,
  onCancel,
  onSend,
}: {
  scope: UploadScope;
  onCancel: () => void;
  onSend: (file: UploadFile) => boolean;
}) {
  const [state, setState] = useState<VoiceState>({ phase: 'idle', durationMs: 0 });
  const recorder = useRef<VoiceRecorder | null>(null);
  const preview = useRef<HTMLAudioElement>(null);
  const [sent, setSent] = useState(false);
  const sending = useRef(false);
  useEffect(() => {
    const instance = isNativeShell()
      ? new NativeVoiceRecorder(setState, {
          workspaceId: scope.workspaceId,
          channelId: scope.channelId,
        })
      : new BrowserVoiceRecorder(setState);
    recorder.current = instance;
    return () => instance.dispose();
  }, [scope.workspaceId, scope.channelId]);
  useEffect(() => {
    const audio = preview.current;
    return () => audio?.pause();
  }, [state.previewUrl]);
  const recording = state.phase === 'recording';
  const paused = state.phase === 'paused';
  const ready = state.phase === 'ready';

  function send() {
    if (sending.current || !state.file) return;
    sending.current = true;
    setSent(true);
    if (!onSend(state.file)) {
      sending.current = false;
      setSent(false);
      return;
    }
    recorder.current?.take();
    onCancel();
  }

  return (
    <AdaptiveModal open title="Голосове повідомлення" footer={null} onCancel={onCancel} width={420}>
      <div className={styles.content}>
        <div className={styles.status} role="status">
          {recording && <span className={styles.dot} />}
          {state.phase === 'idle' && 'Готові записати?'}
          {state.phase === 'requesting' && 'Очікуємо дозвіл на мікрофон…'}
          {recording && 'Триває запис'}
          {paused && 'Запис на паузі'}
          {state.phase === 'stopping' && 'Готуємо запис…'}
          {ready && 'Прослухайте перед надсиланням'}
        </div>
        <output className={styles.time} aria-label="Тривалість запису">
          {voiceTime(state.durationMs)}
        </output>
        {state.error && <p role="alert">{state.error}</p>}
        <p className={styles.hint}>
          До 10 хвилин · запис надішлеться лише після вашого підтвердження
        </p>
        {ready && state.previewUrl && (
          <audio
            ref={preview}
            className={styles.audio}
            controls
            src={state.previewUrl}
            aria-label="Прослухати запис"
            onPlay={(event) => claimAudioPlayback(event.currentTarget)}
          />
        )}
        {ready && !state.previewUrl && (
          <Button
            icon={state.playing ? <PauseIcon /> : <PlayIcon />}
            onClick={() => recorder.current?.preview()}
          >
            {state.playing ? 'Пауза прослуховування' : 'Прослухати запис'}
          </Button>
        )}
        <div className={styles.controls}>
          {state.phase === 'idle' && (
            <Button
              type="primary"
              icon={<MicrophoneIcon />}
              onClick={() => void recorder.current?.start()}
            >
              Почати запис
            </Button>
          )}
          {(recording || paused) && (
            <>
              <Button
                icon={paused ? <MicrophoneIcon /> : <PauseIcon />}
                onClick={() => (paused ? recorder.current?.resume() : recorder.current?.pause())}
              >
                {paused ? 'Продовжити запис' : 'Пауза запису'}
              </Button>
              <Button
                type="primary"
                icon={<StopIcon />}
                onClick={() => void recorder.current?.stop()}
              >
                Завершити запис
              </Button>
            </>
          )}
          {ready && (
            <Button type="primary" disabled={sent} onClick={send}>
              Надіслати голосове
            </Button>
          )}
        </div>
        <Button type="text" onClick={onCancel}>
          Скасувати запис
        </Button>
      </div>
    </AdaptiveModal>
  );
}
