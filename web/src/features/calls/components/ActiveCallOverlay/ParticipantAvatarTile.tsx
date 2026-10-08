import {
  isTrackReference,
  type TrackReferenceOrPlaceholder,
  useIsMuted,
  useTrackVolume,
} from '@livekit/components-react';
import { MicrophoneSlashIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';

import { Avatar } from '@/shared/ui/Avatar/Avatar';

const useStyles = createStyles(({ token, css }) => ({
  tile: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    max-width: 180px;
  `,
  ring: css`
    display: flex;
    border-radius: 50%;
    padding: ${token.paddingXXS}px;
    transition: box-shadow 0.08s ease-out;
  `,
  name: css`
    display: flex;
    align-items: center;
    max-width: 100%;
    color: ${token.colorText};
    font-size: ${token.fontSizeLG}px;
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
    background: ${token.colorFillSecondary};
    color: ${token.colorTextSecondary};
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
            ? { boxShadow: `0 0 0 ${glow}px rgba(9, 198, 204, ${0.12 + volume * 0.36})` }
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
