import { useIsRecording } from '@livekit/components-react';
import { useTranslation } from 'react-i18next';

import styles from './RecordingIndicator.module.css';

/** Tells everyone in the call while the room is being recorded, for as long as it is. */
export function RecordingIndicator() {
  const { t } = useTranslation('calls');
  const recording = useIsRecording();
  if (!recording) return null;

  return (
    <span className={styles.indicator} role="status">
      <span className={styles.dot} aria-hidden />
      {t(($) => $.overlay.recording)}
    </span>
  );
}
