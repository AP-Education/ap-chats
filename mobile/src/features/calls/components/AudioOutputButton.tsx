import type { TFunction } from 'i18next';
import { Bluetooth, Headphones, type Icon, SpeakerHigh } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, Alert, Platform } from 'react-native';

import type { AudioOutput, AudioOutputKind, CallAudioRoute } from '../types';
import { selectAudioOutput } from '../utils/audio-route';
import { withCallKit } from '../utils/callkit-module';
import { CallControlButton } from './CallControlButton';

const ICON_BY_KIND: Record<AudioOutputKind, Icon> = {
  speaker: SpeakerHigh,
  earpiece: SpeakerHigh,
  wired: Headphones,
  bluetooth: Bluetooth,
};

interface AudioOutputButtonProps {
  route?: CallAudioRoute;
  size: number;
}

/** Telegram's audio button: a speaker toggle, or a device picker once a headset is connected. */
export function AudioOutputButton({ route, size }: AudioOutputButtonProps) {
  const { t } = useTranslation('calls');
  const current = route?.current;
  const headset = route?.private && route.private.kind !== 'earpiece' ? route.private : undefined;

  const onSpeaker = current?.kind === 'speaker';
  const isHighlighted = current !== undefined && current.kind !== 'earpiece';
  const OutputIcon = ICON_BY_KIND[current?.kind ?? 'earpiece'];

  function press() {
    if (headset) pickAudioOutput(headset, switchAudioOutput, t);
    else switchAudioOutput(onSpeaker ? 'earpiece' : 'speaker');
  }

  return (
    <CallControlButton
      icon={OutputIcon}
      tone={isHighlighted ? 'pressed' : 'glass'}
      accessibilityLabel={
        headset
          ? t(($) => $.audio.pick)
          : onSpeaker
            ? t(($) => $.audio.speakerOff)
            : t(($) => $.audio.speakerOn)
      }
      size={size}
      label={headset ? t(($) => $.audio.label) : t(($) => $.audio.speaker)}
      onPress={press}
    />
  );
}

function switchAudioOutput(kind: AudioOutputKind) {
  withCallKit((CallKit) => selectAudioOutput(CallKit, kind));
}

function pickAudioOutput(
  headset: AudioOutput,
  onPick: (kind: AudioOutputKind) => void,
  t: TFunction<'calls'>,
) {
  const fallbackNameByKind: Record<AudioOutputKind, string> = {
    speaker: t(($) => $.audio.speaker),
    earpiece: t(($) => $.audio.earpiece),
    wired: t(($) => $.audio.wired),
    bluetooth: t(($) => $.audio.bluetooth),
  };
  const choices = [
    { label: fallbackNameByKind.speaker, kind: 'speaker' as const },
    { label: headset.name || fallbackNameByKind[headset.kind], kind: headset.kind },
  ];

  if (Platform.OS === 'ios') {
    const options = [...choices.map((choice) => choice.label), t(($) => $.audio.cancel)];
    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex: choices.length },
      (index) => {
        const choice = choices[index];
        if (choice) onPick(choice.kind);
      },
    );
    return;
  }

  Alert.alert(
    t(($) => $.audio.title),
    undefined,
    [
      ...choices.map((choice) => ({ text: choice.label, onPress: () => onPick(choice.kind) })),
      { text: t(($) => $.audio.cancel), style: 'cancel' as const },
    ],
  );
}
