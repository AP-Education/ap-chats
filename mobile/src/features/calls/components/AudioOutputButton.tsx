import { Bluetooth, Headphones, type Icon, SpeakerHigh } from 'phosphor-react-native';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import type { AudioOutput, AudioOutputKind, CallAudioRoute } from '../types';
import { selectAudioOutput } from '../utils/audio-route';
import { loadCallKitModule } from '../utils/callkit-module';

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
  style: StyleProp<ViewStyle>;
  activeStyle: StyleProp<ViewStyle>;
}

/** Telegram's audio button: a speaker toggle, or a device picker once a headset is connected. */
export function AudioOutputButton({ route, style, activeStyle }: AudioOutputButtonProps) {
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
    <Pressable style={[style, isHighlighted && activeStyle]} onPress={press}>
      <OutputIcon size={26} color={isHighlighted ? '#0f645b' : '#fff'} />
    </Pressable>
  );
}

function switchAudioOutput(kind: AudioOutputKind) {
  void loadCallKitModule().then((CallKit) => CallKit && selectAudioOutput(CallKit, kind));
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
