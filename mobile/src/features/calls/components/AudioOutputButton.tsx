import { Bluetooth, Headphones, type Icon, SpeakerHigh } from 'phosphor-react-native';
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

const FALLBACK_NAME_BY_KIND: Record<AudioOutputKind, string> = {
  speaker: 'Динамік',
  earpiece: 'Телефон',
  wired: 'Навушники',
  bluetooth: 'Bluetooth',
};

interface AudioOutputButtonProps {
  route?: CallAudioRoute;
  size: number;
}

/** Telegram's audio button: a speaker toggle, or a device picker once a headset is connected. */
export function AudioOutputButton({ route, size }: AudioOutputButtonProps) {
  const current = route?.current;
  const headset = route?.private && route.private.kind !== 'earpiece' ? route.private : undefined;

  const onSpeaker = current?.kind === 'speaker';
  const isHighlighted = current !== undefined && current.kind !== 'earpiece';
  const OutputIcon = ICON_BY_KIND[current?.kind ?? 'earpiece'];

  function press() {
    if (headset) pickAudioOutput(headset, switchAudioOutput);
    else switchAudioOutput(onSpeaker ? 'earpiece' : 'speaker');
  }

  return (
    <CallControlButton
      icon={OutputIcon}
      tone={isHighlighted ? 'pressed' : 'glass'}
      accessibilityLabel={
        headset ? 'Вибрати аудіовихід' : onSpeaker ? 'Вимкнути динамік' : 'Увімкнути динамік'
      }
      size={size}
      label={headset ? 'Аудіо' : 'Динамік'}
      onPress={press}
    />
  );
}

function switchAudioOutput(kind: AudioOutputKind) {
  withCallKit((CallKit) => selectAudioOutput(CallKit, kind));
}

function pickAudioOutput(headset: AudioOutput, onPick: (kind: AudioOutputKind) => void) {
  const choices = [
    { label: FALLBACK_NAME_BY_KIND.speaker, kind: 'speaker' as const },
    { label: headset.name || FALLBACK_NAME_BY_KIND[headset.kind], kind: headset.kind },
  ];

  if (Platform.OS === 'ios') {
    const options = [...choices.map((choice) => choice.label), 'Скасувати'];
    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex: choices.length },
      (index) => {
        const choice = choices[index];
        if (choice) onPick(choice.kind);
      },
    );
    return;
  }

  Alert.alert('Аудіовихід', undefined, [
    ...choices.map((choice) => ({ text: choice.label, onPress: () => onPick(choice.kind) })),
    { text: 'Скасувати', style: 'cancel' as const },
  ]);
}
