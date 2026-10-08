import {
  type Icon,
  Microphone,
  MicrophoneSlash,
  PhoneX,
  SpeakerHigh,
  VideoCameraSlash,
} from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { CALL_GLASS } from '../callTheme';
import { useNativeCallStore } from '../store/native-call-store';
import { withCallKit } from '../utils/callkit-module';
import { CallControlButton, type CallControlTone } from './CallControlButton';

interface ControlState {
  icon: Icon;
  tone: CallControlTone;
  accessibilityLabel: string;
}

const MICROPHONE: Record<'live' | 'muted', ControlState> = {
  live: { icon: Microphone, tone: 'glass', accessibilityLabel: 'Вимкнути мікрофон' },
  muted: { icon: MicrophoneSlash, tone: 'pressed', accessibilityLabel: 'Увімкнути мікрофон' },
};

const SPEAKER: Record<'earpiece' | 'speaker', ControlState> = {
  earpiece: { icon: SpeakerHigh, tone: 'glass', accessibilityLabel: 'Увімкнути динамік' },
  speaker: { icon: SpeakerHigh, tone: 'pressed', accessibilityLabel: 'Вимкнути динамік' },
};

interface ControlProps {
  size: number;
  iconSize?: number;
  label?: string;
}

function useMuted() {
  return useNativeCallStore((state) => state.call?.isMuted ?? false);
}

// Through CallKit rather than local state: the system call UI and ours share one
// path, and the store updates from CallKit's own SetMuted event.
function toggleMute() {
  const call = useNativeCallStore.getState().call;
  if (!call) return;
  withCallKit((CallKit) => CallKit.setMuted(call.sessionId, !call.isMuted));
}

export function MuteControl(props: ControlProps) {
  const state = useMuted() ? MICROPHONE.muted : MICROPHONE.live;
  return <CallControlButton {...state} {...props} onPress={toggleMute} />;
}

export function SpeakerControl(props: ControlProps) {
  const [speakerOn, setSpeakerOn] = useState(false);
  const state = speakerOn ? SPEAKER.speaker : SPEAKER.earpiece;

  function toggleSpeaker() {
    const next = !speakerOn;
    setSpeakerOn(next);
    withCallKit((CallKit) => CallKit.setAudioSessionPortOverride(next));
  }

  return <CallControlButton {...state} {...props} onPress={toggleSpeaker} />;
}

/** No video in the native layer yet: shown disabled rather than omitted, so the
 * control row keeps its shape the day video lands. */
export function CameraPlaceholderControl(props: ControlProps) {
  return (
    <CallControlButton
      icon={VideoCameraSlash}
      accessibilityLabel="Камера недоступна"
      disabled
      {...props}
    />
  );
}

export function EndCallControl({ wide, ...props }: ControlProps & { wide?: boolean }) {
  function endCall() {
    const call = useNativeCallStore.getState().call;
    if (!call) return;
    withCallKit((CallKit) => CallKit.endCall(call.sessionId));
  }

  return (
    <CallControlButton
      icon={PhoneX}
      iconWeight="fill"
      tone="danger"
      accessibilityLabel="Завершити дзвінок"
      wide={wide}
      {...props}
      onPress={endCall}
    />
  );
}

/** Always laid out, only shown when muted: toggling the mic never moves the stage. */
export function MutedMicrophoneHint() {
  const muted = useMuted();

  return (
    <Pressable
      style={[styles.hint, !muted && styles.hidden]}
      disabled={!muted}
      accessibilityElementsHidden={!muted}
      importantForAccessibility={muted ? 'auto' : 'no-hide-descendants'}
      accessibilityRole="button"
      accessibilityLabel="Увімкнути мікрофон"
      onPress={toggleMute}
    >
      <MicrophoneSlash size={14} color="#fff" weight="fill" />
      <Text style={styles.hintText}>Ваш мікрофон вимкнено</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: CALL_GLASS,
  },
  hintText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  hidden: { opacity: 0 },
});
