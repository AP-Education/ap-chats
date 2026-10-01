import { Microphone, MicrophoneSlash, PhoneX } from 'phosphor-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useIsMiniCallBarVisible, useNativeCallStore } from '../store/native-call-store';
import { loadCallKitModule } from '../utils/callkit-module';
import { useCallDuration } from '../utils/use-call-duration';
import { CallSurfaceBackground } from './CallSurfaceBackground';

/**
 * The app-level "return to call" strip — mirrors web/'s MiniCallBar. A normal
 * flex sibling of WebViewHost (not an absolute overlay): App.tsx renders this
 * above it in a column, so the WebView actually shrinks to make room instead
 * of this bar covering its top edge. WebViewHost reads useIsMiniCallBarVisible
 * too, to stop reserving its own top safe-area padding underneath this one.
 */
export function NativeMiniCallBar() {
  const visible = useIsMiniCallBarVisible();
  const call = useNativeCallStore((state) => state.call);
  const restore = useNativeCallStore((state) => state.restore);
  const duration = useCallDuration(call?.connectedAt);

  if (!visible || !call) return null;

  const title = call.caller.displayName ?? 'Дзвінок';

  function toggleMute() {
    if (!call) return;
    void loadCallKitModule().then((CallKit) => CallKit?.setMuted(call.sessionId, !call.isMuted));
  }

  function endCall() {
    if (!call) return;
    void loadCallKitModule().then((CallKit) => CallKit?.endCall(call.sessionId));
  }

  return (
    <View style={styles.wrapper}>
      <CallSurfaceBackground />
      <SafeAreaView edges={['top']}>
        <Pressable style={styles.bar} onPress={restore}>
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.duration}>{duration}</Text>
          </View>
          <Pressable style={styles.iconButton} onPress={toggleMute}>
            {call.isMuted ? (
              <MicrophoneSlash size={18} color="#fff" />
            ) : (
              <Microphone size={18} color="#fff" />
            )}
          </Pressable>
          <Pressable style={[styles.iconButton, styles.endButton]} onPress={endCall}>
            <PhoneX size={18} color="#fff" weight="fill" />
          </Pressable>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative', overflow: 'hidden' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 40,
    paddingVertical: 4,
    paddingHorizontal: 14,
  },
  // No dot here — the system already shows its own "call in progress"
  // indicator (the Dynamic Island pill) above this whenever an active CallKit
  // call isn't being shown full-screen; a second one here just doubled up.
  info: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 8, minWidth: 0 },
  title: { color: '#fff', fontSize: 14, fontWeight: '600', flexShrink: 1 },
  duration: { color: 'rgba(255, 255, 255, 0.72)', fontSize: 13, fontVariant: ['tabular-nums'] },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  endButton: { backgroundColor: '#d92d20' },
});
