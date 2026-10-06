import { Avatar } from '@ap/shell-ui';
import {
  isTrackReference,
  type TrackReferenceOrPlaceholder,
  useIsMuted,
  useTrackVolume,
} from '@livekit/components-react';
import { MicrophoneSlashIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';

const useStyles = createStyles(({ css }) => ({
  tile: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    max-width: 160px;
  `,
  ring: css`
    display: flex;
    border-radius: 50%;
    padding: 3px;
    transition: box-shadow 0.08s ease-out;
  `,
  name: css`
    display: flex;
    align-items: center;
    max-width: 100%;
    color: rgba(255, 255, 255, 0.92);
    font-size: 18px;
    font-weight: 600;
  `,
  nameText: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  muted: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    margin-left: 6px;
    flex-shrink: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.14);
    color: rgba(255, 255, 255, 0.75);
  `,
}));

interface ParticipantAvatarTileProps {
  name: string;
  avatarPath: string | null;
  micTrackRef: TrackReferenceOrPlaceholder;
  size?: number;
}

/** The ring glows in real time with how loud this person's mic actually is —
 * Telegram's "waving" call indicator — rather than a fixed on/off pulse. */
export function ParticipantAvatarTile({
  name,
  avatarPath,
  micTrackRef,
  size = 88,
}: ParticipantAvatarTileProps) {
  const { styles } = useStyles();
  const muted = useIsMuted(micTrackRef);
  const volume = useTrackVolume(isTrackReference(micTrackRef) ? micTrackRef : undefined);
  const glow = Math.min(volume * 26, 16);

  return (
    <div className={styles.tile}>
      <div
        className={styles.ring}
        style={
          glow > 0.5
            ? { boxShadow: `0 0 0 ${glow}px rgba(12, 125, 119, ${0.15 + volume * 0.4})` }
            : undefined
        }
      >
        <Avatar path={avatarPath} alt={name} size={size} shape="circle" />
      </div>
      <span className={styles.name}>
        <span className={styles.nameText}>{name}</span>
        {muted && (
          <span className={styles.muted} aria-label="Мікрофон вимкнено">
            <MicrophoneSlashIcon size={14} weight="fill" />
          </span>
        )}
      </span>
    </div>
  );
}
