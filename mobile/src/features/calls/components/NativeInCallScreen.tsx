import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '../../../shell/theme';
import { useNativeCallStore } from '../store/native-call-store';
import { loadCallKitModule } from '../utils/callkit-module';

/**
 * The entire in-call surface for a native (CallKit/Telecom) call — rendered
 * alongside <WebViewHost/>, not inside it. Mute/end round-trip through
 * expo-callkit-telecom rather than touching local state directly: the same
 * SetMutedActionEvent listener that drives the system UI's mute button is
 * what updates isMuted here (see CallSessionController.onSetMuted).
 */
export function NativeInCallScreen() {
  const call = useNativeCallStore((state) => state.call);
  const [speakerOn, setSpeakerOn] = useState(false);

  if (!call) return null;

  function toggleSpeaker() {
    const next = !speakerOn;
    setSpeakerOn(next);
    void loadCallKitModule().then((CallKit) => CallKit?.setAudioSessionPortOverride(next));
  }

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>
            {(call.caller.displayName ?? '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{call.caller.displayName ?? 'Дзвінок'}</Text>
        <Text style={styles.status}>
          {call.status === 'connecting' ? "З'єднання" : 'У дзвінку'}
        </Text>

        <View style={styles.actions}>
          <Pressable
            style={[styles.circleButton, call.isMuted && styles.circleButtonActive]}
            onPress={() =>
              void loadCallKitModule().then((CallKit) =>
                CallKit?.setMuted(call.sessionId, !call.isMuted),
              )
            }
          >
            <Ionicons
              name={call.isMuted ? 'mic-off' : 'mic'}
              size={26}
              color={call.isMuted ? colors.surface : colors.text}
            />
          </Pressable>
          <Pressable
            style={[styles.circleButton, speakerOn && styles.circleButtonActive]}
            onPress={toggleSpeaker}
          >
            <Ionicons
              name="volume-high"
              size={26}
              color={speakerOn ? colors.surface : colors.text}
            />
          </Pressable>
          <Pressable
            style={[styles.circleButton, styles.endButton]}
            onPress={() =>
              void loadCallKitModule().then((CallKit) => CallKit?.endCall(call.sessionId))
            }
          >
            <Ionicons name="call" size={26} color={colors.surface} style={styles.endIcon} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill, backgroundColor: colors.text, zIndex: 20 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarInitial: { fontSize: 36, fontWeight: '700', color: colors.surface },
  name: { fontSize: 22, fontWeight: '700', color: colors.surface },
  status: { fontSize: 15, color: colors.border, marginTop: spacing.xs },
  actions: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.xl * 1.5,
  },
  circleButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleButtonActive: { backgroundColor: colors.primary },
  endButton: { backgroundColor: '#d92d20' },
  endIcon: { transform: [{ rotate: '135deg' }] },
});
