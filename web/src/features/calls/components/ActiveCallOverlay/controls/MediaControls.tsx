import { useIsMobile } from '@ap-education/ui';
import { useLocalParticipant } from '@livekit/components-react';
import {
  ArrowsClockwiseIcon,
  MicrophoneIcon,
  MicrophoneSlashIcon,
  ScreencastIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
} from '@phosphor-icons/react';
import { Track } from 'livekit-client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { playMuteChime, playUnmuteChime } from '../../../sound/callChimes';
import { CallActionButton } from '../../CallActionButton/CallActionButton';
import {
  type CallControlSize,
  TrackToggleControl,
  type TrackToggleStates,
} from './TrackToggleControl';

const MICROPHONE: TrackToggleStates = {
  on: { label: 'muteMicrophone', icon: MicrophoneIcon, tone: 'glass' },
  off: { label: 'unmuteMicrophone', icon: MicrophoneSlashIcon, tone: 'pressed' },
};

const CAMERA: TrackToggleStates = {
  on: { label: 'turnOffCamera', icon: VideoCameraIcon, tone: 'pressed' },
  off: { label: 'turnOnCamera', icon: VideoCameraSlashIcon, tone: 'glass' },
};

const SCREEN_SHARE: TrackToggleStates = {
  on: { label: 'stopScreenShare', icon: ScreencastIcon, tone: 'pressed' },
  off: { label: 'startScreenShare', icon: ScreencastIcon, tone: 'glass' },
};

function playMicrophoneChime(wasEnabled: boolean) {
  if (wasEnabled) playMuteChime();
  else playUnmuteChime();
}

export function MicrophoneControl(size: CallControlSize) {
  return (
    <TrackToggleControl
      source={Track.Source.Microphone}
      states={MICROPHONE}
      onToggle={playMicrophoneChime}
      {...size}
    />
  );
}

export function CameraControl({
  hiddenWhenOff,
  ...size
}: CallControlSize & { hiddenWhenOff?: boolean }) {
  return (
    <TrackToggleControl
      source={Track.Source.Camera}
      states={CAMERA}
      hiddenWhenOff={hiddenWhenOff}
      {...size}
    />
  );
}

export function ScreenShareControl(size: CallControlSize) {
  return <TrackToggleControl source={Track.Source.ScreenShare} states={SCREEN_SHARE} {...size} />;
}

/** Phones carry two cameras; offered only while one of them is actually streaming. */
export function FlipCameraControl({ size, iconSize }: CallControlSize) {
  const { t } = useTranslation('calls');
  const isMobile = useIsMobile();
  const { localParticipant, isCameraEnabled } = useLocalParticipant();
  // There's no reliable cross-browser way to read a track's current facing side
  // back out, so this just tracks which one the button last asked for.
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  if (!isMobile || !isCameraEnabled) return null;

  async function flipCamera() {
    const track = localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack;
    if (!track) return;
    const next = facingMode === 'user' ? 'environment' : 'user';
    await track.restartTrack({ facingMode: next });
    setFacingMode(next);
  }

  return (
    <CallActionButton
      size={size}
      aria-label={t(($) => $.controls.flipCamera)}
      onClick={() => void flipCamera()}
    >
      <ArrowsClockwiseIcon size={iconSize} />
    </CallActionButton>
  );
}
