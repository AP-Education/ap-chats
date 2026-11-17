import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CALL_PALETTE } from '../callTheme';

/** Mirrors web/'s RecordingIndicator: tells everyone in the call while the room is recorded. */
export function RecordingBadge() {
  const { t } = useTranslation('calls');
  const [opacity] = useState(() => new Animated.Value(1));
  const notice = t(($) => $.recordingNotice);

  // Android speaks the live region as the badge appears; VoiceOver needs to be told.
  useEffect(() => {
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(notice);
  }, [notice]);

  useEffect(() => {
    let cleanedUp = false;
    let blink: Animated.CompositeAnimation | undefined;

    // Follows the setting while the call goes on: reduced motion leaves the dot lit and still.
    function follow(reduced: boolean) {
      blink?.stop();
      blink = undefined;
      if (cleanedUp) return;
      if (reduced) {
        opacity.setValue(1);
        return;
      }
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
    }

    void AccessibilityInfo.isReduceMotionEnabled().then(follow);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', follow);

    return () => {
      cleanedUp = true;
      subscription.remove();
      blink?.stop();
    };
  }, [opacity]);

  return (
    <View
      style={styles.badge}
      accessible
      accessibilityRole="text"
      accessibilityLabel={notice}
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
