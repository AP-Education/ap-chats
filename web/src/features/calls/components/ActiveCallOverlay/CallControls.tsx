import { useIsMobile } from '@ap/ui';
import {
  useDisconnectButton,
  useLocalParticipant,
  useTrackToggle,
} from '@livekit/components-react';
import {
  ArrowsClockwiseIcon,
  MicrophoneIcon,
  MicrophoneSlashIcon,
  ScreencastIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
} from '@phosphor-icons/react';
import { createStyles } from 'antd-style';
import { Track } from 'livekit-client';
import { type MouseEvent, useState } from 'react';

import { EndCallIcon } from '../../callIcons';
import { playMuteChime, playUnmuteChime } from '../../sound/callChimes';
import { CallActionButton } from './CallActionButton';

const useStyles = createStyles(({ css }) => ({
  bar: css`
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    gap: 14px;
    padding: 20px 10px calc(20px + env(safe-area-inset-bottom, 0px));

    @media (max-width: 480px) {
      gap: 8px;
    }
  `,
}));

export function CallControls() {
  const { styles } = useStyles();
  const isMobile = useIsMobile();
  const mic = useTrackToggle({ source: Track.Source.Microphone });
  const camera = useTrackToggle({ source: Track.Source.Camera });
  const screenShare = useTrackToggle({ source: Track.Source.ScreenShare });
  const leave = useDisconnectButton({});
  const { localParticipant } = useLocalParticipant();
  // Phones publish the front camera first; there's no reliable cross-browser
  // way to read a track's current facing side back out, so this just tracks
  // which one this button last asked for.
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  async function flipCamera() {
    const track = localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack;
    if (!track) return;
    const next = facingMode === 'user' ? 'environment' : 'user';
    await track.restartTrack({ facingMode: next });
    setFacingMode(next);
  }

  function handleMicClick(event: MouseEvent<HTMLButtonElement>) {
    (mic.enabled ? playMuteChime : playUnmuteChime)();
    mic.buttonProps.onClick?.(event);
  }

  return (
    <div className={styles.bar}>
      <CallActionButton
        size={52}
        variant={mic.enabled ? 'default' : 'off'}
        {...mic.buttonProps}
        onClick={handleMicClick}
        aria-label={mic.enabled ? 'Вимкнути мікрофон' : 'Увімкнути мікрофон'}
      >
        {mic.enabled ? <MicrophoneIcon size={22} /> : <MicrophoneSlashIcon size={22} />}
      </CallActionButton>
      <CallActionButton
        size={52}
        variant={camera.enabled ? 'default' : 'off'}
        {...camera.buttonProps}
        aria-label={camera.enabled ? 'Вимкнути камеру' : 'Увімкнути камеру'}
      >
        {camera.enabled ? <VideoCameraIcon size={22} /> : <VideoCameraSlashIcon size={22} />}
      </CallActionButton>
      {isMobile && camera.enabled && (
        <CallActionButton size={52} aria-label="Змінити камеру" onClick={() => void flipCamera()}>
          <ArrowsClockwiseIcon size={22} />
        </CallActionButton>
      )}
      <CallActionButton
        size={52}
        variant={screenShare.enabled ? 'off' : 'default'}
        {...screenShare.buttonProps}
        aria-label={screenShare.enabled ? 'Зупинити демонстрацію екрана' : 'Демонструвати екран'}
      >
        <ScreencastIcon size={22} />
      </CallActionButton>
      <CallActionButton
        size={52}
        variant="leave"
        {...leave.buttonProps}
        aria-label="Завершити дзвінок"
      >
        <EndCallIcon size={22} weight="fill" />
      </CallActionButton>
    </div>
  );
}
