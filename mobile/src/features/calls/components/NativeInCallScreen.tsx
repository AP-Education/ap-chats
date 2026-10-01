import {
  CaretDown,
  Microphone,
  MicrophoneSlash,
  PhoneX,
  SpeakerHigh,
  VideoCameraSlash,
} from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNativeCallStore } from '../store/native-call-store';
import { loadCallKitModule } from '../utils/callkit-module';
import { useCallDuration } from '../utils/use-call-duration';
import { CallSurfaceBackground } from './CallSurfaceBackground';

/**
 * The connected in-call surface — rendered alongside <WebViewHost/>, not inside
 * it. Mute/end round-trip through expo-callkit-telecom rather than touching
 * local state directly: the same SetMutedActionEvent listener that drives the
 * system UI's mute button is what updates isMuted here (see
 * CallSessionController.onSetMuted). NativeIncomingCallScreen owns the
 * pre-answer "ringing" state, and NativeMiniCallBar the minimized one — this
 * only ever renders the full-screen, connecting/connected, not-minimized case.
 * Mirrors web/'s CallScreen, icon-for-icon (phosphor-react-native, the same
 * set web/'s @phosphor-icons/react uses).
 */
export function NativeInCallScreen() {
  const call = useNativeCallStore((state) => state.call);
  const minimized = useNativeCallStore((state) => state.minimized);
  const minimize = useNativeCallStore((state) => state.minimize);
  const [speakerOn, setSpeakerOn] = useState(false);
  const duration = useCallDuration(call?.connectedAt);

  if (!call || call.status === 'ringing' || minimized) return null;

  function toggleMute() {
    if (!call) return;
    void loadCallKitModule().then((CallKit) => CallKit?.setMuted(call.sessionId, !call.isMuted));
  }

  function endCall() {
    if (!call) return;
    void loadCallKitModule().then((CallKit) => CallKit?.endCall(call.sessionId));
  }

  function toggleSpeaker() {
    const next = !speakerOn;
    setSpeakerOn(next);
    void loadCallKitModule().then((CallKit) => CallKit?.setAudioSessionPortOverride(next));
  }

  const title = call.caller.displayName ?? 'Дзвінок';
  // Web's ParticipantAvatarTile glows with the *other* person's live mic
  // volume, 0-1 scaled the same way (min(volume*26, 16)) into a shadow radius
  // — this is that, via a platform shadow instead of a CSS box-shadow.
  const glowRadius = Math.min((call.remoteAudioLevel ?? 0) * 26, 16);

  return (
    <View style={styles.fill}>
      <CallSurfaceBackground />
      <SafeAreaView style={styles.content}>
        <View style={styles.header}>
          <Pressable style={styles.minimizeButton} onPress={minimize}>
            <CaretDown size={20} color="rgba(255, 255, 255, 0.7)" />
          </Pressable>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.duration}>
            {call.status === 'connecting' ? "З'єднання" : duration}
          </Text>
        </View>

        <View style={styles.stage}>
          <View
            style={[
              styles.avatarRing,
              call.remoteSpeaking && {
                shadowRadius: glowRadius,
                shadowOpacity: 0.15 + (call.remoteAudioLevel ?? 0) * 0.4,
              },
            ]}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{title.charAt(0).toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{title}</Text>
            {call.remoteMuted && <MicrophoneSlash size={16} color="rgba(255, 255, 255, 0.7)" />}
          </View>
        </View>

        <View style={styles.controlsArea}>
          <View style={styles.actionsWrapper}>
            {call.isMuted && (
              <Pressable style={styles.mutedBadge} onPress={toggleMute}>
                <MicrophoneSlash size={14} color="#fff" />
                <Text style={styles.mutedBadgeText}>Ваш мікрофон вимкнено</Text>
              </Pressable>
            )}
            <View style={styles.actions}>
              <Pressable
                style={[styles.circleButton, call.isMuted && styles.circleButtonActive]}
                onPress={toggleMute}
              >
                {call.isMuted ? (
                  <MicrophoneSlash size={26} color="#0f645b" />
                ) : (
                  <Microphone size={26} color="#fff" />
                )}
              </Pressable>
              {/* No video in the native layer yet — shown disabled rather than
                  omitted, so the control row doesn't visibly change shape the
                  day video does land. */}
              <View style={[styles.circleButton, styles.circleButtonDisabled]}>
                <VideoCameraSlash size={26} color="rgba(255, 255, 255, 0.4)" />
              </View>
              <Pressable
                style={[styles.circleButton, speakerOn && styles.circleButtonActive]}
                onPress={toggleSpeaker}
              >
                <SpeakerHigh size={26} color={speakerOn ? '#0f645b' : '#fff'} />
              </Pressable>
              <Pressable style={[styles.circleButton, styles.endButton]} onPress={endCall}>
                <PhoneX size={26} color="#fff" weight="fill" />
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill, zIndex: 20 },
  content: { flex: 1 },
  header: { alignItems: 'center', paddingTop: 8 },
  minimizeButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#fff' },
  duration: { fontSize: 13, color: 'rgba(255, 255, 255, 0.55)', marginTop: 2, minHeight: 18 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  // shadowColor/Opacity/Radius here (iOS) stand in for web's animated
  // box-shadow ring — set conditionally above as the live glow.
  avatarRing: {
    borderRadius: 66,
    shadowColor: '#0c7d77',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  avatar: {
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarInitial: { fontSize: 44, fontWeight: '700', color: '#fff' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 20, fontWeight: '700', color: '#fff' },
  controlsArea: { alignItems: 'center', paddingBottom: 28 },
  // position:'relative' so mutedBadge can anchor to this row's own top edge —
  // it must never push the actions row down when it appears, same as web/'s
  // absolutely positioned version. A fixed `bottom` (circleButton height + the
  // gap below), not a percentage: Yoga doesn't reliably resolve percentage
  // insets against an auto-sized (content-driven) containing block.
  actionsWrapper: { position: 'relative', alignItems: 'center' },
  mutedBadge: {
    position: 'absolute',
    bottom: 76,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  mutedBadgeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 20 },
  circleButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleButtonActive: { backgroundColor: '#fff' },
  circleButtonDisabled: { opacity: 0.5 },
  endButton: { backgroundColor: '#d92d20' },
});
