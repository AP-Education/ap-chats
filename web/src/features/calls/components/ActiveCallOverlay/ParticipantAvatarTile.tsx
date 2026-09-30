import {
  type TrackReferenceOrPlaceholder,
  useIsMuted,
  useIsSpeaking,
} from '@livekit/components-react';
import { MicrophoneSlashIcon } from '@phosphor-icons/react';
import { createStyles, keyframes } from 'antd-style';
import type { Participant } from 'livekit-client';

import { Avatar } from '@/shared/ui/Avatar/Avatar';

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(12, 125, 119, 0.55); }
  50% { box-shadow: 0 0 0 8px rgba(12, 125, 119, 0); }
`;

const useStyles = createStyles(({ css }) => ({
  tile: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    max-width: 128px;
  `,
  ring: css`
    display: flex;
    border-radius: 50%;
    padding: 3px;
  `,
  speaking: css`
    animation: ${pulse} 1.6s ease-out infinite;
  `,
  name: css`
    display: flex;
    align-items: center;
    max-width: 100%;
    color: rgba(255, 255, 255, 0.92);
    font-size: 14px;
    font-weight: 550;
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
    width: 18px;
    height: 18px;
    margin-left: 5px;
    flex-shrink: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.14);
    color: rgba(255, 255, 255, 0.75);
  `,
}));

interface ParticipantAvatarTileProps {
  participant: Participant;
  name: string;
  avatarPath: string | null;
  micTrackRef: TrackReferenceOrPlaceholder;
  size?: number;
}

export function ParticipantAvatarTile({
  participant,
  name,
  avatarPath,
  micTrackRef,
  size = 88,
}: ParticipantAvatarTileProps) {
  const { styles, cx } = useStyles();
  const speaking = useIsSpeaking(participant);
  const muted = useIsMuted(micTrackRef);

  return (
    <div className={styles.tile}>
      <div className={cx(styles.ring, speaking && styles.speaking)}>
        <Avatar path={avatarPath} alt={name} size={size} shape="circle" />
      </div>
      <span className={styles.name}>
        <span className={styles.nameText}>{name}</span>
        {muted && (
          <span className={styles.muted} aria-label="Мікрофон вимкнено">
            <MicrophoneSlashIcon size={12} weight="fill" />
          </span>
        )}
      </span>
    </div>
  );
}
