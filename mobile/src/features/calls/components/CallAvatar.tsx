import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { CALL_PALETTE } from '../callTheme';
import { avatarColors, avatarInitials } from '../utils/avatar-fallback';

interface CallAvatarProps {
  name: string;
  size: number;
  /** Ripples outward while the call still rings, like web's RingingAvatar. */
  ringing?: boolean;
  /** The other person's live mic level, 0 to 1: the glow web's ParticipantAvatarTile draws. */
  level?: number;
}

export function CallAvatar({ name, size, ringing = false, level = 0 }: CallAvatarProps) {
  const glowRadius = Math.min(level * 26, 16);
  const colors = avatarColors(name);

  return (
    <View style={{ width: size, height: size }}>
      {ringing && <Ripple size={size} delay={0} />}
      {ringing && <Ripple size={size} delay={1200} />}
      <View
        style={[
          styles.avatar,
          { width: size, height: size, borderRadius: size / 2 },
          glowRadius > 0.5 && { shadowRadius: glowRadius, shadowOpacity: 0.12 + level * 0.36 },
        ]}
      >
        <LinearGradient
          colors={[colors.from, colors.to]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.tile, { borderRadius: size / 2 }]}
        >
          <Text
            style={[styles.initials, { color: colors.initials, fontSize: Math.round(size * 0.38) }]}
          >
            {avatarInitials(name)}
          </Text>
        </LinearGradient>
      </View>
    </View>
  );
}

function Ripple({ size, delay }: { size: number; delay: number }) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const ripple = Animated.sequence([
      Animated.delay(delay),
      Animated.loop(
        Animated.timing(progress, {
          toValue: 1,
          duration: 2400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ),
    ]);
    ripple.start();
    return () => ripple.stop();
  }, [delay, progress]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ripple,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0] }),
          transform: [
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.6] }) },
          ],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  avatar: {
    shadowColor: CALL_PALETTE.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  tile: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  initials: { fontWeight: '600', letterSpacing: 0.5 },
  ripple: { position: 'absolute', backgroundColor: CALL_PALETTE.cyan },
});
