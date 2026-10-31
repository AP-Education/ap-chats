import { isNativeShell } from '@ap-education/shell-sdk';
import { IconButton } from '@ap-education/ui';
import {
  CaretLeftIcon,
  LockSimpleIcon,
  MicrophoneIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { type ReactNode, useEffect, useEffectEvent, useRef, useState } from 'react';

import { useCallStore } from '@/features/calls/store/call-store';

import type { UploadFile, UploadScope } from '../attachments/types';
import { BrowserVoiceRecorder } from './browser-recorder';
import { NativeVoiceRecorder } from './native-recorder';
import { claimAudioPlayback, releaseAudioPlayback } from './playback';
import { type VoiceGestureMode, type VoiceRecorder, type VoiceState, voiceTime } from './types';
import styles from './VoiceComposer.module.css';
import { VoiceRecordAction } from './VoiceRecordAction';

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
  const [mode, setMode] = useState<VoiceGestureMode>('locked');
  const latest = useRef<VoiceState>(EMPTY);
  const pendingSend = useRef(false);
  const sending = useRef(false);
  const recorder = useRef<VoiceRecorder | null>(null);
  const busy = useCallStore((call) => Boolean(call.active || call.incoming));

  useEffect(() => () => recorder.current?.dispose(), [scope.workspaceId, scope.channelId]);
  useEffect(() => {
    if (!busy) return;
    pendingSend.current = false;
    if (recorder.current instanceof BrowserVoiceRecorder) recorder.current.interrupt();
  }, [busy]);
  const sendReady = useEffectEvent(() => {
    if (state.file && pendingSend.current) commit(state.file);
  });
  useEffect(() => {
    if (state.phase === 'ready') sendReady();
  }, [state.phase, state.file]);
  useEffect(() => {
    const hidden = () => {
      if (document.visibilityState !== 'hidden') return;
      pendingSend.current = false;
      setMode('locked');
    };
    document.addEventListener('visibilitychange', hidden);
    return () => document.removeEventListener('visibilitychange', hidden);
  }, []);

  function start() {
    if (busy || disabled || (recorder.current && latest.current.phase !== 'error')) return false;
    recorder.current?.dispose();
    const changed = (next: VoiceState) => {
      latest.current = next;
      if (next.phase === 'error') pendingSend.current = false;
      if (next.phase === 'error' || (next.phase === 'ready' && !pendingSend.current))
        setSent(false);
      if (next.phase === 'ready' || next.phase === 'error' || next.phase === 'stopping')
        setMode('locked');
      setState(next);
    };
    const instance = isNativeShell()
      ? new NativeVoiceRecorder(changed, scope)
      : new BrowserVoiceRecorder(changed);
    recorder.current = instance;
    sending.current = false;
    pendingSend.current = false;
    latest.current = EMPTY;
    setSent(false);
    setState(EMPTY);
    setActive(true);
    onStart();
    // Keep microphone acquisition in the tap's user activation, including Safari.
    void instance.start();
    return true;
  }

  function cancel() {
    recorder.current?.dispose();
    recorder.current = null;
    pendingSend.current = false;
    latest.current = EMPTY;
    setMode('locked');
    setActive(false);
    setState(EMPTY);
  }

  function commit(file: UploadFile) {
    if (sending.current) return;
    sending.current = true;
    setSent(true);
    if (!onSend(file)) {
      sending.current = false;
      pendingSend.current = false;
      setSent(false);
      return;
    }
    recorder.current?.take();
    cancel();
  }

  function send() {
    if (sending.current || pendingSend.current) return;
    const current = latest.current;
    if (current.file) {
      commit(current.file);
      return;
    }
    if (current.phase !== 'recording' && current.phase !== 'paused') return;
    pendingSend.current = true;
    setSent(true);
    setMode('locked');
    void recorder.current?.stop();
  }

  function release(shortTap: boolean) {
    setMode('locked');
    if (shortTap) return;
    const current = latest.current;
    if (
      current.phase === 'requesting' ||
      (current.phase === 'recording' && current.durationMs < 500)
    )
      cancel();
    else if (current.phase === 'recording') send();
  }

  function interrupt() {
    pendingSend.current = false;
    setMode('locked');
    if (latest.current.phase === 'requesting') cancel();
    else void recorder.current?.stop();
  }

  return (
    <>
      <div className={styles.textComposer} hidden={active}>
        {children}
      </div>
      {active && (
        <VoiceRecording
          state={state}
          busy={busy}
          mode={mode}
          onCancel={cancel}
          onPause={() => recorder.current?.pause()}
          onResume={() => recorder.current?.resume()}
          onStop={() => void recorder.current?.stop()}
          onPreview={() => recorder.current?.preview()}
        />
      )}
      <VoiceRecordAction
        active={active}
        visible={visible}
        disabled={disabled}
        busy={busy}
        phase={state.phase}
        mode={mode}
        sent={sent}
        onStart={start}
        onMode={setMode}
        onRelease={release}
        onInterrupt={interrupt}
        onCancel={cancel}
        onSend={send}
      />
    </>
  );
}

function VoiceRecording({
  state,
  busy,
  mode,
  onCancel,
  onPause,
  onResume,
  onStop,
  onPreview,
}: {
  state: VoiceState;
  busy: boolean;
  mode: VoiceGestureMode;
  onCancel: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onPreview: () => void;
}) {
  const preview = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const holding = mode !== 'locked';
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
        {!holding && (
          <IconButton
            size={44}
            aria-label="Скасувати запис"
            title="Скасувати запис"
            onClick={onCancel}
          >
            <TrashIcon size={22} />
          </IconButton>
        )}
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
            {recording && !holding && (
              <>
                <LockSimpleIcon size={12} /> Триває запис
              </>
            )}
            {paused && 'Запис на паузі'}
            {state.phase === 'stopping' && 'Готуємо запис…'}
            {ready && 'Перевірте запис'}
            {state.phase === 'error' && 'Запис недоступний'}
          </span>
        </div>
        {holding && (
          <span className={styles.slideHint} data-cancelling={mode === 'cancelling' || undefined}>
            <CaretLeftIcon size={16} /> Скасувати
          </span>
        )}
        {!holding && (recording || paused) && (
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
      {!busy && !state.error && (
        <p className={styles.hint}>
          {holding
            ? 'Відпустіть — надіслати'
            : ready
              ? 'Прослухайте або надішліть'
              : 'Запис без утримання · до 10 хв'}
        </p>
      )}
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
