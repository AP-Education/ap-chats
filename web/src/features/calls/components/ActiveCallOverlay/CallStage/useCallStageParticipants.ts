import {
  type TrackReference,
  type TrackReferenceOrPlaceholder,
  useLocalParticipant,
  useParticipants,
  useTracks,
} from '@livekit/components-react';
import type { Participant } from 'livekit-client';
import { Track } from 'livekit-client';

import { useWorkspaceMemberLabels } from '@/features/workspaces/hooks/useWorkspaceMemberLabels';

export interface StageParticipant {
  participant: Participant;
  name: string;
  avatarPath: string | null;
  micTrackRef: TrackReferenceOrPlaceholder;
}

export interface GridTile {
  track: TrackReference;
  label: string;
}

export interface DominantThumbnail extends StageParticipant {
  videoTrack: TrackReference | undefined;
}

export interface Callee {
  name: string;
  avatarPath: string | null;
}

export type StageView =
  | { kind: 'waiting'; callee?: Callee }
  | { kind: 'avatars'; participants: StageParticipant[]; tileSize: number }
  | { kind: 'dominant'; track: TrackReference; label: string; thumbnails: DominantThumbnail[] }
  | { kind: 'grid'; tiles: GridTile[]; avatarOnly: StageParticipant[] };

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

/**
 * Decides what the call stage looks like right now: an empty waiting state,
 * big avatars, one dominant video/screen-share feed, or a multi-tile grid.
 * The single source of truth for "is there video to protect" — CallScreen's
 * chrome (floating vs. in-flow) and CallStage's own layout both read it from
 * here, so they can never disagree about whether video is on screen.
 */
export function useCallStageParticipants(workspaceId: string, callee?: Callee): StageView {
  const allParticipants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const { bySub } = useWorkspaceMemberLabels(workspaceId);
  const micTracks = useTracks([Track.Source.Microphone]);
  const allVideoTracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], {
    onlySubscribed: true,
  });

  // A call with more than one other person reads as a group call, and shows
  // everyone including you. Otherwise — whether it's a 1:1 or you're still
  // alone waiting for the other side — your own tile never appears on stage,
  // so there's no moment where it flips from "you" to "them" once they join.
  const others = allParticipants.filter(
    (participant) => participant.identity !== localParticipant.identity,
  );
  const isGroup = others.length > 1;
  const participants = isGroup ? allParticipants : others;
  const videoTracks = isGroup
    ? allVideoTracks
    : allVideoTracks.filter((ref) => ref.participant.identity !== localParticipant.identity);

  function labelFor(identity: string, fallback: string | undefined) {
    const member = bySub.get(identity)?.member;
    return {
      name: member?.profile.displayName ?? fallback ?? 'Учасник',
      avatarPath: member?.profile.avatarPath ?? null,
    };
  }

  function toStageParticipant(participant: Participant): StageParticipant {
    const { name, avatarPath } = labelFor(participant.identity, participant.name);
    return {
      participant,
      name,
      avatarPath,
      micTrackRef: micRefFor(participant.identity, micTracks, participant),
    };
  }

  // A screen share always wins the stage, whatever the call size: whoever's
  // presenting is what everyone needs to see, at a size that's legible.
  // Failing that, a 1:1 call's one video feed is the whole stage too.
  const screenShare = videoTracks.find((ref) => ref.source === Track.Source.ScreenShare);
  const dominant =
    screenShare ?? (!isGroup && videoTracks.length === 1 ? videoTracks[0] : undefined);

  if (dominant) {
    const { name } = labelFor(dominant.participant.identity, dominant.participant.name);
    const label = name + (dominant.source === Track.Source.ScreenShare ? ' демонструє екран' : '');
    const thumbnailParticipants = participants.filter(
      (participant) => participant.identity !== dominant.participant.identity,
    );
    return {
      kind: 'dominant',
      track: dominant,
      label,
      thumbnails: thumbnailParticipants.map((participant) => ({
        ...toStageParticipant(participant),
        videoTrack: videoTracks.find((ref) => ref.participant.identity === participant.identity),
      })),
    };
  }

  const videoIdentities = new Set(videoTracks.map((ref) => ref.participant.identity));
  const avatarOnly = participants.filter(
    (participant) => !videoIdentities.has(participant.identity),
  );

  if (videoTracks.length === 0) {
    if (participants.length === 0) return { kind: 'waiting', callee };
    return {
      kind: 'avatars',
      participants: participants.map(toStageParticipant),
      tileSize: isGroup ? 88 : 160,
    };
  }

  return {
    kind: 'grid',
    tiles: videoTracks.map((track) => ({
      track,
      label: labelFor(track.participant.identity, track.participant.name).name,
    })),
    avatarOnly: avatarOnly.map(toStageParticipant),
  };
}
