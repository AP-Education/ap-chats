import { useTrackToggle } from '@livekit/components-react';
import type { Icon } from '@phosphor-icons/react';
import type { Track } from 'livekit-client';
import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { CallActionButton, type CallActionTone } from '../../CallActionButton/CallActionButton';

export interface CallControlSize {
  size: number;
  iconSize: number;
}

export type TrackToggleLabel =
  | 'muteMicrophone'
  | 'unmuteMicrophone'
  | 'turnOffCamera'
  | 'turnOnCamera'
  | 'stopScreenShare'
  | 'startScreenShare';

interface TrackToggleState {
  label: TrackToggleLabel;
  icon: Icon;
  tone: CallActionTone;
}

/** How a toggle reads while its track is published and while it isn't. */
export interface TrackToggleStates {
  on: TrackToggleState;
  off: TrackToggleState;
}

interface TrackToggleControlProps extends CallControlSize {
  source: Track.Source.Microphone | Track.Source.Camera | Track.Source.ScreenShare;
  states: TrackToggleStates;
  /** Shows the control only while the track is on, for surfaces with room for less. */
  hiddenWhenOff?: boolean;
  onToggle?: (wasEnabled: boolean) => void;
}

export function TrackToggleControl({
  source,
  states,
  size,
  iconSize,
  hiddenWhenOff = false,
  onToggle,
}: TrackToggleControlProps) {
  const { t } = useTranslation('calls');
  const toggle = useTrackToggle({ source });

  if (hiddenWhenOff && !toggle.enabled) return null;

  const { label, icon: StateIcon, tone } = toggle.enabled ? states.on : states.off;

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onToggle?.(toggle.enabled);
    toggle.buttonProps.onClick?.(event);
  }

  return (
    <CallActionButton
      size={size}
      tone={tone}
      {...toggle.buttonProps}
      onClick={handleClick}
      aria-label={t(($) => $.controls[label])}
    >
      <StateIcon size={iconSize} />
    </CallActionButton>
  );
}
