import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { CALL_PALETTE } from '../callTheme';

/** Mirrors web/'s RecordingIndicator: tells everyone in the call while the room is recorded. */
export function RecordingBadge() {
  const { t } = useTranslation('calls');
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    let blink: Animated.CompositeAnimation | undefined;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) return;
      blink = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.35,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      blink.start();
    });
    return () => blink?.stop();
  }, [opacity]);

  return (
    <View
      style={styles.badge}
      accessible
      accessibilityRole="text"
      accessibilityLabel={t(($) => $.recordingNotice)}
      accessibilityLiveRegion="polite"
    >
      <Animated.View style={[styles.dot, { opacity }]} />
      <Text style={styles.label}>{t(($) => $.recording)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(229, 72, 77, 0.18)',
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: CALL_PALETTE.danger },
  label: { color: '#fff', fontSize: 13 },
});
