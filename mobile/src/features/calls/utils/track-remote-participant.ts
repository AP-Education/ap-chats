import {
  type Participant,
  type Room,
  RoomEvent,
  Track,
  type TrackPublication,
} from 'livekit-client';

export interface RemoteParticipantUpdate {
  remoteMuted: boolean;
  remoteSpeaking: boolean;
  remoteAudioLevel: number;
  /** Not the participant's: the room's own, while the call service records it. */
  recording: boolean;
}

/** Mirrors web/'s ParticipantAvatarTile: a live glow ring driven by the remote
 * participant's actual mic volume, and a mute badge driven by their actual
 * mute state — not this device's own. ActiveSpeakersChanged only fires on
 * speaking-state transitions, not every level tick, so a short poll fills in
 * the smooth swell web gets from useTrackVolume's own per-frame updates. */
export function trackRemoteParticipant(
  room: Room,
  onUpdate: (update: RemoteParticipantUpdate) => void,
): () => void {
  function remote(): Participant | undefined {
    return Array.from(room.remoteParticipants.values())[0];
  }

  function remoteMicMuted(participant: Participant | undefined): boolean {
    if (!participant) return false;
    const mic = Array.from(participant.audioTrackPublications.values()).find(
      (pub) => pub.source === Track.Source.Microphone,
    );
    return mic?.isMuted ?? false;
  }

  function emit() {
    const participant = remote();
    onUpdate({
      remoteMuted: remoteMicMuted(participant),
      remoteSpeaking: participant?.isSpeaking ?? false,
      remoteAudioLevel: participant?.audioLevel ?? 0,
      recording: room.isRecording,
    });
  }

  function onTrackMuteChange(_pub: TrackPublication, participant: Participant) {
    if (participant.isLocal) return;
    emit();
  }

  room.on(RoomEvent.TrackMuted, onTrackMuteChange);
  room.on(RoomEvent.TrackUnmuted, onTrackMuteChange);
  room.on(RoomEvent.ActiveSpeakersChanged, emit);
  room.on(RoomEvent.ParticipantConnected, emit);
  room.on(RoomEvent.RecordingStatusChanged, emit);
  const interval = setInterval(emit, 150);
  emit();

  return () => {
    clearInterval(interval);
    room.off(RoomEvent.TrackMuted, onTrackMuteChange);
    room.off(RoomEvent.TrackUnmuted, onTrackMuteChange);
    room.off(RoomEvent.ActiveSpeakersChanged, emit);
    room.off(RoomEvent.ParticipantConnected, emit);
    room.off(RoomEvent.RecordingStatusChanged, emit);
  };
}
