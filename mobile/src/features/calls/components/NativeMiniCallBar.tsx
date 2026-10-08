import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CALL_TEXT_MUTED } from '../callTheme';
import { useIsMiniCallBarVisible, useNativeCallStore } from '../store/native-call-store';
import { useCallDuration } from '../utils/use-call-duration';
import { CallSurfaceBackground } from './CallSurfaceBackground';
import { EndCallControl, MuteControl } from './NativeCallControls';

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

  return (
    <View style={styles.wrapper}>
      <CallSurfaceBackground />
      <SafeAreaView edges={['top']}>
        <View style={styles.bar}>
          <Pressable
            style={styles.info}
            accessibilityRole="button"
            accessibilityLabel={`Повернутися до дзвінка: ${title}`}
            onPress={restore}
          >
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.duration}>{duration}</Text>
          </Pressable>
          <MuteControl size={34} iconSize={18} />
          <EndCallControl size={34} iconSize={18} wide />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative', overflow: 'hidden' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingVertical: 6,
    paddingLeft: 16,
    paddingRight: 10,
  },
  // No dot here — the system already shows its own "call in progress"
  // indicator (the Dynamic Island pill) above this whenever an active CallKit
  // call isn't being shown full-screen; a second one here just doubled up.
  info: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 8, minWidth: 0 },
  title: { color: '#fff', fontSize: 15, fontWeight: '600', flexShrink: 1 },
  duration: { color: CALL_TEXT_MUTED, fontSize: 13, fontVariant: ['tabular-nums'] },
});
