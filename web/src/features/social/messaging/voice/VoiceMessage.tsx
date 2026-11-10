import { IconButton, LoadingIcon } from '@ap-education/ui';
import { DownloadSimpleIcon, PauseIcon, PlayIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

import type { FileAttachmentProps } from '../components/MessageAttachments/FileAttachment';
import {
  useAttachmentDownload,
  useAttachmentUrl,
} from '../components/MessageAttachments/useAttachmentAccess';
import { claimAudioPlayback, releaseAudioPlayback } from './playback';
import { voiceTime } from './types';
import styles from './VoiceMessage.module.css';

export function VoiceMessage({ attachment, messageId, available }: FileAttachmentProps) {
  const player = useRef<HTMLAudioElement>(null);
  const [requested, setRequested] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [rate, setRate] = useState(1);
  const [failed, setFailed] = useState(false);
  const access = useAttachmentUrl(messageId, attachment.id, 'preview', available && requested);
  const download = useAttachmentDownload(messageId, attachment);
  const durationMs = attachment.voice!.durationMs;
  const duration = durationMs / 1000;
  const progress = Math.min(position, duration);
  const elapsedLabel = voiceTime(progress * 1000);
  const durationLabel = voiceTime(durationMs);
  const loading = requested && access.isPending;
  const showError = failed || (requested && access.isError);
  const PlaybackIcon = playing ? PauseIcon : PlayIcon;

  useEffect(() => {
    const element = player.current;
    return () => {
      if (element) {
        element.pause();
        releaseAudioPlayback(element);
      }
    };
  }, []);

  useEffect(() => {
    if (!available) player.current?.pause();
  }, [available]);

  useEffect(() => {
    if (access.data && requested && available)
      void player.current?.play().catch(() => setPlaying(false));
  }, [access.data, requested, available]);

  function play() {
    if (!available) return;
    setRequested(true);
    if (playing) {
      player.current?.pause();
      return;
    }
    if (player.current?.src) void player.current.play().catch(() => setPlaying(false));
  }

  function retry() {
    setFailed(false);
    void access.refetch();
  }

  return (
    <div className={styles.root} role="group" aria-label="Голосове повідомлення">
      <button
        type="button"
        className={styles.play}
        aria-label={playing ? 'Призупинити голосове' : 'Відтворити голосове'}
        disabled={!available || loading}
        onClick={play}
      >
        {loading ? <LoadingIcon size={20} /> : <PlaybackIcon size={20} weight="fill" />}
      </button>
      <div className={styles.body}>
        <div className={styles.seek}>
          <progress className={styles.track} value={progress} max={duration} aria-hidden="true" />
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={progress}
            aria-label="Позиція голосового"
            aria-valuetext={`${elapsedLabel} з ${durationLabel}`}
            disabled={!available || !access.data}
            onChange={(event) => {
              const seconds = Number(event.target.value);
              if (player.current) player.current.currentTime = seconds;
              setPosition(seconds);
            }}
          />
        </div>
        <div className={styles.details}>
          <span className={styles.time}>
            {position > 0 && `${elapsedLabel} / `}
            {durationLabel}
          </span>
          <button
            type="button"
            className={styles.speed}
            aria-label="Швидкість відтворення"
            onClick={() => {
              const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
              setRate(next);
              if (player.current) player.current.playbackRate = next;
            }}
          >
            {rate}×
          </button>
          <IconButton
            size={36}
            className={styles.download}
            aria-label={`Завантажити ${attachment.name}`}
            disabled={!available || download.downloading}
            onClick={() => void download.download()}
          >
            {download.downloading ? <LoadingIcon size={20} /> : <DownloadSimpleIcon size={20} />}
          </IconButton>
        </div>
      </div>
      {loading && (
        <span className={styles.status} role="status">
          Завантажуємо голосове
        </span>
      )}
      {showError && (
        <button type="button" className={styles.retry} onClick={retry}>
          Не вдалося відтворити · Повторити
        </button>
      )}
      <audio
        ref={player}
        src={available ? access.data?.url : undefined}
        preload="none"
        aria-label="Аудіо голосового повідомлення"
        onPlay={(event) => {
          claimAudioPlayback(event.currentTarget);
          setPlaying(true);
        }}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
        onEnded={() => setPlaying(false)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
