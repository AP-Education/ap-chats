import { useDisconnectButton, useTrackToggle } from '@livekit/components-react';
import {
  MicrophoneIcon,
  MicrophoneSlashIcon,
  PhoneXIcon,
  ScreencastIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
} from '@phosphor-icons/react';
import { createStyles } from 'antd-style';
import { Track } from 'livekit-client';

const useStyles = createStyles(({ css }) => ({
  bar: css`
    position: absolute;
    left: 50%;
    bottom: 28px;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(16px);

    @media (max-width: 480px) {
      bottom: 16px;
      gap: 6px;
      padding: 8px;
    }
  `,
  button: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    @media (max-width: 480px) {
      width: 46px;
      height: 46px;
    }
  `,
  off: css`
    background: #fff;
    color: #17181c;

    &:hover {
      background: rgba(255, 255, 255, 0.85);
    }
  `,
  leave: css`
    background: #e5484d;

    &:hover {
      background: #c6373c;
    }
  `,
}));

export function CallControls() {
  const { styles, cx } = useStyles();
  const mic = useTrackToggle({ source: Track.Source.Microphone });
  const camera = useTrackToggle({ source: Track.Source.Camera });
  const screenShare = useTrackToggle({ source: Track.Source.ScreenShare });
  const leave = useDisconnectButton({});

  return (
    <div className={styles.bar}>
      <button
        type="button"
        {...mic.buttonProps}
        className={cx(styles.button, !mic.enabled && styles.off)}
        aria-label={mic.enabled ? 'Вимкнути мікрофон' : 'Увімкнути мікрофон'}
      >
        {mic.enabled ? <MicrophoneIcon size={22} /> : <MicrophoneSlashIcon size={22} />}
      </button>
      <button
        type="button"
        {...camera.buttonProps}
        className={cx(styles.button, !camera.enabled && styles.off)}
        aria-label={camera.enabled ? 'Вимкнути камеру' : 'Увімкнути камеру'}
      >
        {camera.enabled ? <VideoCameraIcon size={22} /> : <VideoCameraSlashIcon size={22} />}
      </button>
      <button
        type="button"
        {...screenShare.buttonProps}
        className={cx(styles.button, screenShare.enabled && styles.off)}
        aria-label={screenShare.enabled ? 'Зупинити демонстрацію екрана' : 'Демонструвати екран'}
      >
        <ScreencastIcon size={22} />
      </button>
      <button
        type="button"
        {...leave.buttonProps}
        className={cx(styles.button, styles.leave)}
        aria-label="Завершити дзвінок"
      >
        <PhoneXIcon size={22} weight="fill" />
      </button>
    </div>
  );
}
