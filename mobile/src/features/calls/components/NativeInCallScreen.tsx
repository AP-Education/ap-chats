import { StatusBar } from 'expo-status-bar';
import { CaretDown, MicrophoneSlash } from 'phosphor-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CALL_TEXT_MUTED } from '../callTheme';
import { type NativeCallState, useNativeCallStore } from '../store/native-call-store';
import { useCallDuration } from '../utils/use-call-duration';
import { CallAvatar } from './CallAvatar';
import { CallControlButton } from './CallControlButton';
import { CallSurfaceBackground } from './CallSurfaceBackground';
import {
  CameraPlaceholderControl,
  EndCallControl,
  MuteControl,
  MutedMicrophoneHint,
  SpeakerControl,
} from './NativeCallControls';

/**
 * The connected in-call surface — rendered alongside <WebViewHost/>, not inside
 * it. NativeIncomingCallScreen owns the pre-answer "ringing" state, and
 * NativeMiniCallBar the minimized one — this only ever renders the full-screen,
 * connecting/connected, not-minimized case. Mirrors web/'s CallScreen,
 * icon-for-icon (phosphor-react-native, the same set web/'s @phosphor-icons/react uses).
 */
export function NativeInCallScreen() {
  const call = useNativeCallStore((state) => state.call);
  const minimized = useNativeCallStore((state) => state.minimized);
  const minimize = useNativeCallStore((state) => state.minimize);

  if (!call || call.status === 'ringing' || minimized) return null;

  const title = call.caller.displayName ?? 'Дзвінок';

  return (
    <View style={styles.fill}>
      <CallSurfaceBackground />
      <StatusBar style="light" />
      <SafeAreaView style={styles.content}>
        <View style={styles.header}>
          <View style={styles.minimize}>
            <CallControlButton
              icon={CaretDown}
              accessibilityLabel="Згорнути дзвінок"
              size={40}
              iconSize={20}
              onPress={minimize}
            />
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <CallStatusLine call={call} />
        </View>

        <View style={styles.stage}>
          <CallAvatar name={title} size={132} level={speakingLevel(call)} />
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {title}
            </Text>
            {call.remoteMuted && <MicrophoneSlash size={18} color={CALL_TEXT_MUTED} />}
          </View>
        </View>

        <View style={styles.controlsArea}>
          <MutedMicrophoneHint />
          <View style={styles.actions}>
            <MuteControl size={64} label="Мікрофон" />
            <CameraPlaceholderControl size={64} label="Камера" />
            <SpeakerControl size={64} label="Динамік" />
            <EndCallControl size={64} label="Завершити" />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

/** The other person's live mic level drives the avatar glow, like web's ParticipantAvatarTile. */
function speakingLevel(call: NativeCallState): number {
  if (!call.remoteSpeaking) return 0;
  return call.remoteAudioLevel ?? 0;
}

function CallStatusLine({ call }: { call: NativeCallState }) {
  const duration = useCallDuration(call.connectedAt);

  if (call.status === 'connecting') return <Text style={styles.duration}>З'єднання</Text>;
  return <Text style={styles.duration}>{duration}</Text>;
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill, zIndex: 20 },
  content: { flex: 1 },
  header: { alignItems: 'center', paddingTop: 12, paddingHorizontal: 72 },
  minimize: { position: 'absolute', top: 8, left: 16 },
  title: { color: '#fff', fontSize: 17, fontWeight: '600' },
  duration: {
    marginTop: 2,
    minHeight: 18,
    color: CALL_TEXT_MUTED,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 28 },
  name: { flexShrink: 1, color: '#fff', fontSize: 26, fontWeight: '600' },
  controlsArea: { alignItems: 'center', gap: 20, paddingBottom: 32 },
  actions: { flexDirection: 'row', gap: 20 },
});
