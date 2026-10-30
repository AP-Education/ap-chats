import { isNativeShell } from '@ap-education/shell-sdk';
import { IconButton } from '@ap-education/ui';
import {
  ArrowClockwiseIcon,
  ArrowUpIcon,
  MicrophoneIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { useCallStore } from '@/features/calls/store/call-store';

import type { UploadFile, UploadScope } from '../attachments/types';
import { BrowserVoiceRecorder } from './browser-recorder';
import { NativeVoiceRecorder } from './native-recorder';
import { claimAudioPlayback, releaseAudioPlayback } from './playback';
import { type VoiceRecorder, type VoiceState, voiceTime } from './types';
import styles from './VoiceComposer.module.css';

const EMPTY: VoiceState = { phase: 'idle', durationMs: 0 };

export function VoiceComposer({
  scope,
  disabled,
  visible = true,
  children,
  onStart,
  onSend,
}: {
  scope: UploadScope;
  disabled: boolean;
  visible?: boolean;
  children: ReactNode;
  onStart: () => void;
  onSend: (file: UploadFile) => boolean;
}) {
  const [active, setActive] = useState(false);
  const [state, setState] = useState<VoiceState>(EMPTY);
  const [sent, setSent] = useState(false);
  const sending = useRef(false);
  const recorder = useRef<VoiceRecorder | null>(null);
  const microphone = useRef<HTMLButtonElement>(null);
  const wasActive = useRef(false);
  const busy = useCallStore((call) => Boolean(call.active || call.incoming));

  useEffect(() => () => recorder.current?.dispose(), [scope.workspaceId, scope.channelId]);
  useEffect(() => {
    if (busy && recorder.current instanceof BrowserVoiceRecorder) recorder.current.interrupt();
  }, [busy]);
  useEffect(() => {
    if (wasActive.current && !active) microphone.current?.focus({ preventScroll: true });
    wasActive.current = active;
  }, [active]);

  function start() {
    if (busy || disabled || (recorder.current && state.phase !== 'error')) return;
    recorder.current?.dispose();
    const instance = isNativeShell()
      ? new NativeVoiceRecorder(setState, scope)
      : new BrowserVoiceRecorder(setState);
    recorder.current = instance;
    sending.current = false;
    setSent(false);
    setState(EMPTY);
    setActive(true);
    onStart();
    // Keep microphone acquisition in the tap's user activation, including Safari.
    void instance.start();
  }

  function cancel() {
    recorder.current?.dispose();
    recorder.current = null;
    setActive(false);
    setState(EMPTY);
  }

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
    cancel();
  }

  return (
    <>
      <div className={styles.textComposer} hidden={active}>
        {children}
      </div>
      {!active && visible && (
        <IconButton
          ref={microphone}
          size={44}
          className={styles.microphone}
          aria-label="Записати голосове повідомлення"
          disabled={disabled || busy}
          title={busy ? 'Запис недоступний під час дзвінка' : 'Записати голосове'}
          onPointerDown={(event) => event.preventDefault()}
          onClick={start}
        >
          <MicrophoneIcon size={23} />
        </IconButton>
      )}
      {active && (
        <VoiceRecording
          state={state}
          busy={busy}
          sent={sent}
          onCancel={cancel}
          onRetry={start}
          onPause={() => recorder.current?.pause()}
          onResume={() => recorder.current?.resume()}
          onStop={() => void recorder.current?.stop()}
          onPreview={() => recorder.current?.preview()}
          onSend={send}
        />
      )}
    </>
  );
}

function VoiceRecording({
  state,
  busy,
  sent,
  onCancel,
  onRetry,
  onPause,
  onResume,
  onStop,
  onPreview,
  onSend,
}: {
  state: VoiceState;
  busy: boolean;
  sent: boolean;
  onCancel: () => void;
  onRetry: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onPreview: () => void;
  onSend: () => void;
}) {
  const preview = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const recording = state.phase === 'recording';
  const paused = state.phase === 'paused';
  const ready = state.phase === 'ready';
  const previewPlaying = state.previewUrl ? playing : Boolean(state.playing);

  useEffect(() => {
    const audio = preview.current;
    return () => {
      audio?.pause();
      if (audio) releaseAudioPlayback(audio);
    };
  }, [state.previewUrl]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onCancel();
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [onCancel]);

  function play() {
    setPreviewError(false);
    if (!state.previewUrl) return onPreview();
    if (playing) preview.current?.pause();
    else void preview.current?.play().catch(() => setPreviewError(true));
  }

  return (
    <section className={styles.recording} aria-label="Запис голосового повідомлення">
      <div className={styles.controls}>
        <IconButton
          size={44}
          aria-label="Скасувати запис"
          title="Скасувати запис"
          onClick={onCancel}
        >
          <TrashIcon size={22} />
        </IconButton>
        {ready && (
          <IconButton
            size={44}
            className={styles.preview}
            aria-label={previewPlaying ? 'Пауза прослуховування' : 'Прослухати запис'}
            onClick={play}
          >
            {previewPlaying ? (
              <PauseIcon size={22} weight="fill" />
            ) : (
              <PlayIcon size={22} weight="fill" />
            )}
          </IconButton>
        )}
        <div className={styles.summary}>
          <output className={styles.time} aria-label="Тривалість запису">
            {recording && <span className={styles.dot} aria-hidden="true" />}
            {voiceTime(state.durationMs)}
          </output>
          <span className={styles.status} role="status">
            {state.phase === 'requesting' && 'Підключаємо мікрофон…'}
            {recording && 'Триває запис'}
            {paused && 'Запис на паузі'}
            {state.phase === 'stopping' && 'Готуємо запис…'}
            {ready && 'Перевірте запис'}
            {state.phase === 'error' && 'Запис недоступний'}
          </span>
        </div>
        {(recording || paused) && (
          <>
            <IconButton
              size={44}
              aria-label={paused ? 'Продовжити запис' : 'Пауза запису'}
              disabled={paused && busy}
              onClick={paused ? onResume : onPause}
            >
              {paused ? <MicrophoneIcon size={22} /> : <PauseIcon size={22} />}
            </IconButton>
            <IconButton
              size={44}
              className={styles.stop}
              aria-label="Завершити запис"
              title="Завершити й прослухати"
              onClick={onStop}
            >
              <StopIcon size={21} weight="fill" />
            </IconButton>
          </>
        )}
        {ready && (
          <IconButton
            size={44}
            className={styles.send}
            aria-label="Надіслати голосове"
            title="Надіслати голосове"
            disabled={sent}
            onClick={onSend}
          >
            <ArrowUpIcon size={24} weight="bold" />
          </IconButton>
        )}
        {state.phase === 'error' && (
          <IconButton
            size={44}
            aria-label="Повторити запис"
            title="Повторити запис"
            disabled={busy}
            onClick={onRetry}
          >
            <ArrowClockwiseIcon size={22} />
          </IconButton>
        )}
      </div>
      {busy && (
        <p className={styles.hint} role="status">
          Під час дзвінка запис недоступний.
        </p>
      )}
      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}
      {previewError && (
        <p className={styles.error} role="alert">
          Не вдалося прослухати. Спробуйте ще раз.
        </p>
      )}
      {!busy && !state.error && <p className={styles.hint}>До 10 хв · нічого не надіслано</p>}
      {ready && state.previewUrl && (
        <audio
          ref={preview}
          src={state.previewUrl}
          preload="metadata"
          onPlay={(event) => {
            claimAudioPlayback(event.currentTarget);
            setPlaying(true);
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
      )}
    </section>
  );
}
