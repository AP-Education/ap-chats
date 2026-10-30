import { PauseIcon, PlayIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

import type { FileAttachmentProps } from '../components/MessageAttachments/FileAttachment';
import { FileDownloadButton } from '../components/MessageAttachments/FileDownloadButton';
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
  const duration = attachment.voice!.durationMs / 1000;

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
    <div className={styles.root} aria-label="Голосове повідомлення">
      <button
        type="button"
        className={styles.play}
        aria-label={playing ? 'Призупинити голосове' : 'Відтворити голосове'}
        disabled={!available || (requested && access.isPending)}
        onClick={play}
      >
        {playing ? <PauseIcon size={20} weight="fill" /> : <PlayIcon size={20} weight="fill" />}
      </button>
      <div className={styles.body}>
        <span className={styles.title}>Голосове повідомлення</span>
        <input
          type="range"
          min={0}
          max={duration}
          step={0.1}
          value={Math.min(position, duration)}
          aria-label="Позиція голосового"
          disabled={!available || !access.data}
          onChange={(event) => {
            const seconds = Number(event.target.value);
            if (player.current) player.current.currentTime = seconds;
            setPosition(seconds);
          }}
        />
        <span className={styles.time}>
          {voiceTime(position * 1000)} / {voiceTime(attachment.voice!.durationMs)}
        </span>
        {requested && access.isPending && <span role="status">Завантажуємо…</span>}
        {(failed || (requested && access.isError)) && (
          <button type="button" className={styles.retry} onClick={retry}>
            Не вдалося відтворити · Повторити
          </button>
        )}
      </div>
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
      <FileDownloadButton
        name={attachment.name}
        downloading={download.downloading}
        disabled={!available}
        onPress={() => void download.download()}
      />
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
