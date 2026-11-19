import { IconButton, LoadingIcon } from '@ap-education/ui';
import { DownloadSimpleIcon, PauseIcon, PlayIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { FileAttachmentProps } from '../components/MessageAttachments/FileAttachment';
import {
  useAttachmentDownload,
  useAttachmentUrl,
} from '../components/MessageAttachments/useAttachmentAccess';
import { claimAudioPlayback, releaseAudioPlayback } from './playback';
import { voiceTime } from './types';
import styles from './VoiceMessage.module.css';
import { VoiceMessageFrame } from './VoiceMessageFrame';

export function VoiceMessage({ attachment, messageId, available, footer }: FileAttachmentProps) {
  const { t } = useTranslation('voice');
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
  const remainingLabel = voiceTime(Math.max(0, durationMs - position * 1000));
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
    <VoiceMessageFrame
      playback={
        <button
          type="button"
          className={styles.play}
          aria-label={t(($) => (playing ? $.message.pause : $.message.play))}
          disabled={!available || loading}
          onClick={play}
        >
          {loading ? <LoadingIcon size={20} /> : <PlaybackIcon size={20} weight="fill" />}
        </button>
      }
      seek={
        <>
          <progress className={styles.track} value={progress} max={duration} aria-hidden="true" />
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={progress}
            aria-label={t(($) => $.message.position)}
            aria-valuetext={t(($) => $.message.positionValue, {
              elapsed: elapsedLabel,
              duration: durationLabel,
            })}
            disabled={!available || !access.data}
            onChange={(event) => {
              const seconds = Number(event.target.value);
              if (player.current) player.current.currentTime = seconds;
              setPosition(seconds);
            }}
          />
        </>
      }
      time={position > 0 ? remainingLabel : durationLabel}
      timeLabel={
        position > 0
          ? t(($) => $.message.remaining, { time: remainingLabel })
          : t(($) => $.message.duration, { time: durationLabel })
      }
      speed={
        <button
          type="button"
          className={styles.speed}
          aria-label={t(($) => $.message.speed)}
          onClick={() => {
            const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
            setRate(next);
            if (player.current) player.current.playbackRate = next;
          }}
        >
          {rate}×
        </button>
      }
      action={
        <IconButton
          size={32}
          className={styles.download}
          aria-label={t(($) => $.message.download, { name: attachment.name })}
          disabled={!available || download.downloading}
          onClick={() => void download.download()}
        >
          {download.downloading ? <LoadingIcon size={20} /> : <DownloadSimpleIcon size={20} />}
        </IconButton>
      }
      meta={footer}
    >
      {loading && (
        <span className={styles.uploadStatus} role="status">
          {t(($) => $.message.loading)}
        </span>
      )}
      {showError && (
        <button type="button" className={styles.retry} onClick={retry}>
          {t(($) => $.message.playFailed)}
        </button>
      )}
      <audio
        ref={player}
        src={available ? access.data?.url : undefined}
        preload="none"
        aria-label={t(($) => $.message.audio)}
        onPlay={(event) => {
          claimAudioPlayback(event.currentTarget);
          setPlaying(true);
        }}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
        onEnded={() => setPlaying(false)}
        onError={() => setFailed(true)}
      />
    </VoiceMessageFrame>
  );
}
