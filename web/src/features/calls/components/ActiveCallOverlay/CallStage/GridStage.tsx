import { VideoTrack } from '@livekit/components-react';
import { createStyles, keyframes } from 'antd-style';

import { ParticipantAvatarTile } from '../ParticipantAvatarTile';
import type { StageView } from './useCallStageParticipants';

const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.94); }
  to { opacity: 1; transform: scale(1); }
`;

const useStyles = createStyles(({ css }) => ({
  stage: css`
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 28px;
    min-height: 0;
    padding: 24px;
  `,
  grid: css`
    display: grid;
    flex: 1;
    align-content: center;
    justify-content: center;
    gap: 12px;
    width: 100%;
    max-width: 1100px;
    min-height: 0;
  `,
  tile: css`
    position: relative;
    overflow: hidden;
    aspect-ratio: 16 / 10;
    max-height: 62vh;
    border-radius: 16px;
    background: #000;
    animation: ${fadeIn} 0.25s ease-out;

    video {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
  label: css`
    position: absolute;
    left: 10px;
    bottom: 8px;
    padding: 2px 10px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.5);
    color: #fff;
    font-size: 13px;
    font-weight: 550;
  `,
  strip: css`
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 24px;
    padding-bottom: 8px;
  `,
  avatarTile: css`
    animation: ${fadeIn} 0.25s ease-out;
  `,
}));

/** Discord-style grid density: roomy at low counts, tighter as the call fills up. */
function columnsFor(tileCount: number): number {
  if (tileCount <= 1) return 1;
  if (tileCount <= 4) return 2;
  if (tileCount <= 9) return 3;
  return 4;
}

type GridStageProps = Extract<StageView, { kind: 'grid' }>;

/** A genuine group video call: no single feed to protect, so everyone gets
 * an equally-sized tile in a density-aware grid. */
export function GridStage({ tiles, avatarOnly }: GridStageProps) {
  const { styles } = useStyles();

  return (
    <div className={styles.stage}>
      <div
        className={styles.grid}
        style={{ gridTemplateColumns: `repeat(${columnsFor(tiles.length)}, 1fr)` }}
      >
        {tiles.map(({ track, label }) => (
          <div key={`${track.participant.identity}-${track.source}`} className={styles.tile}>
            <VideoTrack trackRef={track} />
            <span className={styles.label}>{label}</span>
          </div>
        ))}
      </div>
      {avatarOnly.length > 0 && (
        <div className={styles.strip}>
          {avatarOnly.map(({ participant, name, avatarPath, micTrackRef }) => (
            <div key={participant.identity} className={styles.avatarTile}>
              <ParticipantAvatarTile
                name={name}
                avatarPath={avatarPath}
                micTrackRef={micTrackRef}
                size={56}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
