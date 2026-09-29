import { createStyles, keyframes } from 'antd-style';

import { ParticipantAvatarTile } from '../ParticipantAvatarTile';
import type { StageParticipant } from './useCallStageParticipants';

const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.94); }
  to { opacity: 1; transform: scale(1); }
`;

const useStyles = createStyles(({ css }) => ({
  stage: css`
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    min-height: 0;
    padding: 24px;
  `,
  avatars: css`
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: center;
    gap: 36px;
  `,
  tile: css`
    animation: ${fadeIn} 0.25s ease-out;
  `,
}));

interface AvatarStageProps {
  participants: StageParticipant[];
  tileSize: number;
}

/** Audio-only (or camera-off) participants: big avatars, no video to protect. */
export function AvatarStage({ participants, tileSize }: AvatarStageProps) {
  const { styles } = useStyles();

  return (
    <div className={styles.stage}>
      <div className={styles.avatars}>
        {participants.map(({ participant, name, avatarPath, micTrackRef }) => (
          <div key={participant.identity} className={styles.tile}>
            <ParticipantAvatarTile
              name={name}
              avatarPath={avatarPath}
              micTrackRef={micTrackRef}
              size={tileSize}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
