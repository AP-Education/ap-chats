import { VideoTrack } from '@livekit/components-react';
import { createStyles, keyframes } from 'antd-style';

import { Avatar } from '@/shared/ui/Avatar';

import type { DominantThumbnail, StageView } from './useCallStageParticipants';

const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.94); }
  to { opacity: 1; transform: scale(1); }
`;

// The floating control dock's own footprint (CallControls.tsx: the dock plus its
// bar padding), so the thumbnail strip docks just above it instead of under it.
const CONTROLS_CLEARANCE = 112;

const useStyles = createStyles(({ token, css }) => ({
  stage: css`
    position: relative;
    flex: 1;
    min-height: 0;
    width: 100%;
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
    left: 14px;
    top: 14px;
    z-index: 1;
    padding: ${token.paddingXXS}px ${token.paddingSM}px;
    border-radius: 999px;
    background: rgba(7, 17, 19, 0.5);
    backdrop-filter: blur(16px);
    color: ${token.colorText};
    font-size: ${token.fontSizeSM}px;
    font-weight: 550;
  `,
  thumbStrip: css`
    position: absolute;
    left: 0;
    right: 0;
    bottom: ${CONTROLS_CLEARANCE}px;
    z-index: 1;
    display: flex;
    gap: ${token.paddingXS}px;
    padding: 0 16px;
    overflow-x: auto;
  `,
  thumbVideo: css`
    position: relative;
    flex-shrink: 0;
    overflow: hidden;
    width: 96px;
    height: 64px;
    border-radius: ${token.borderRadiusLG}px;
    background: #000;

    video {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
  thumbAvatar: css`
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: ${token.colorFillSecondary};
  `,
}));

type DominantStageProps = Extract<StageView, { kind: 'dominant' }>;

function Thumbnail({ name, avatarPath, videoTrack }: DominantThumbnail) {
  const { styles } = useStyles();

  if (videoTrack)
    return (
      <div className={styles.thumbVideo}>
        <VideoTrack trackRef={videoTrack} />
      </div>
    );

  return (
    <div className={styles.thumbAvatar}>
      <Avatar path={avatarPath} alt={name} size={64} shape="circle" />
    </div>
  );
}

/** One feed IS the call right now (a 1:1 video call or an active screen
 * share): it fills the stage edge to edge instead of sitting in a padded,
 * rounded tile, with everyone else riding along as small thumbnails. */
export function DominantStage({ track, label, thumbnails }: DominantStageProps) {
  const { styles } = useStyles();

  return (
    <div className={styles.stage}>
      <VideoTrack trackRef={track} />
      <span className={styles.label}>{label}</span>
      {thumbnails.length > 0 && (
        <div className={styles.thumbStrip}>
          {thumbnails.map((thumbnail) => (
            <Thumbnail key={thumbnail.participant.identity} {...thumbnail} />
          ))}
        </div>
      )}
    </div>
  );
}
