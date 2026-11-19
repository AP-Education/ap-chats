import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './VoiceMessage.module.css';

interface VoiceMessageFrameProps {
  playback: ReactNode;
  seek: ReactNode;
  time: ReactNode;
  timeLabel?: string;
  speed: ReactNode;
  action: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
}

/** Pending and delivered recordings share their footprint in the timeline. */
export function VoiceMessageFrame({
  playback,
  seek,
  time,
  timeLabel,
  speed,
  action,
  meta,
  children,
}: VoiceMessageFrameProps) {
  const { t } = useTranslation('voice');
  return (
    <div
      className={styles.root}
      role="group"
      aria-label={t(($) => $.message.region)}
      data-voice-message
    >
      {playback}
      <div className={styles.body}>
        <div className={styles.waveform}>
          <div className={styles.seek}>{seek}</div>
          {action}
        </div>
        <div className={styles.details}>
          <span className={styles.time} aria-label={timeLabel}>
            {time}
          </span>
          {speed}
          {meta}
        </div>
      </div>
      {children}
    </div>
  );
}
