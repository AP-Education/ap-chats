import {
  type TrackReferenceOrPlaceholder,
  useParticipants,
  useTracks,
  VideoTrack,
} from '@livekit/components-react';
import { createStyles } from 'antd-style';
import { Track } from 'livekit-client';

import { useWorkspaceMemberLabels } from '@/features/workspaces/hooks/useWorkspaceMemberLabels';

import { ParticipantAvatarTile } from './ParticipantAvatarTile';

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
  avatars: css`
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: center;
    gap: 36px;
  `,
  videoGrid: css`
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 12px;
    width: 100%;
    min-height: 0;
    padding: 12px;
  `,
  videoTile: css`
    position: relative;
    overflow: hidden;
    max-width: min(100%, 860px);
    max-height: 100%;
    border-radius: 16px;
    background: #000;

    video {
      display: block;
      max-width: 100%;
      max-height: 70vh;
    }
  `,
  videoLabel: css`
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
}));

/** A well-formed placeholder when a participant hasn't published a mic track yet. */
function micRefFor(
  identity: string,
  micTracks: TrackReferenceOrPlaceholder[],
  participant: TrackReferenceOrPlaceholder['participant'],
): TrackReferenceOrPlaceholder {
  return (
    micTracks.find((ref) => ref.participant.identity === identity) ?? {
      participant,
      source: Track.Source.Microphone,
    }
  );
}

interface CallStageProps {
  workspaceId: string;
}

/** Reads as a call, not a conferencing grid: big avatars until someone's camera or screen appears. */
export function CallStage({ workspaceId }: CallStageProps) {
  const { styles } = useStyles();
  const participants = useParticipants();
  const { byId } = useWorkspaceMemberLabels(workspaceId);
  const micTracks = useTracks([Track.Source.Microphone]);
  const videoTracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], {
    onlySubscribed: true,
  });

  const videoIdentities = new Set(videoTracks.map((ref) => ref.participant.identity));
  const avatarOnly = participants.filter(
    (participant) => !videoIdentities.has(participant.identity),
  );

  function labelFor(identity: string, fallback: string | undefined) {
    const member = byId.get(identity)?.member;
    return {
      name: member?.profile.displayName ?? fallback ?? 'Учасник',
      avatarPath: member?.profile.avatarPath ?? null,
    };
  }

  if (videoTracks.length === 0) {
    return (
      <div className={styles.stage}>
        <div className={styles.avatars}>
          {participants.map((participant) => {
            const { name, avatarPath } = labelFor(participant.identity, participant.name);
            return (
              <ParticipantAvatarTile
                key={participant.identity}
                participant={participant}
                name={name}
                avatarPath={avatarPath}
                micTrackRef={micRefFor(participant.identity, micTracks, participant)}
                size={participants.length <= 2 ? 128 : 88}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.stage}>
      <div className={styles.videoGrid}>
        {videoTracks.map((trackRef) => {
          const { name } = labelFor(trackRef.participant.identity, trackRef.participant.name);
          return (
            <div
              key={`${trackRef.participant.identity}-${trackRef.source}`}
              className={styles.videoTile}
            >
              <VideoTrack trackRef={trackRef} />
              <span className={styles.videoLabel}>{name}</span>
            </div>
          );
        })}
      </div>
      {avatarOnly.length > 0 && (
        <div className={styles.strip}>
          {avatarOnly.map((participant) => {
            const { name, avatarPath } = labelFor(participant.identity, participant.name);
            return (
              <ParticipantAvatarTile
                key={participant.identity}
                participant={participant}
                name={name}
                avatarPath={avatarPath}
                micTrackRef={micRefFor(participant.identity, micTracks, participant)}
                size={56}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
