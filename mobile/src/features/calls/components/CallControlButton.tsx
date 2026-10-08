import type { Icon, IconWeight } from 'phosphor-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CALL_GLASS, CALL_GLASS_PRESSED, CALL_PALETTE, CALL_TEXT_MUTED } from '../callTheme';

export type CallControlTone = 'glass' | 'pressed' | 'danger' | 'accept';

const TONES = {
  glass: { background: CALL_GLASS, touched: CALL_GLASS_PRESSED, icon: '#fff' },
  pressed: { background: '#fff', touched: '#fff', icon: CALL_PALETTE.ink },
  danger: { background: CALL_PALETTE.danger, touched: CALL_PALETTE.danger, icon: '#fff' },
  accept: { background: CALL_PALETTE.accept, touched: CALL_PALETTE.accept, icon: '#fff' },
} as const;

// Hang-up reads as a pill, wider than the round toggles beside it.
const WIDE_RATIO = 1.36;

interface CallControlButtonProps {
  icon: Icon;
  accessibilityLabel: string;
  size: number;
  /** `pressed` marks a toggle that departs from the call's default, like a muted mic. */
  tone?: CallControlTone;
  wide?: boolean;
  iconSize?: number;
  iconWeight?: IconWeight;
  /** Caption under the button, the way the system call screen labels its controls. */
  label?: string;
  disabled?: boolean;
  onPress?: () => void;
}

/** Mirrors web's CallActionButton: one round control for every call screen. */
export function CallControlButton({
  icon: IconComponent,
  accessibilityLabel,
  size,
  tone = 'glass',
  wide = false,
  iconSize = 24,
  iconWeight = 'regular',
  label,
  disabled = false,
  onPress,
}: CallControlButtonProps) {
  const colors = TONES[tone];
  const width = wide ? Math.round(size * WIDE_RATIO) : size;
  const button = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected: tone === 'pressed' }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          width,
          height: size,
          borderRadius: size / 2,
          backgroundColor: pressed ? colors.touched : colors.background,
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <IconComponent size={iconSize} color={colors.icon} weight={iconWeight} />
    </Pressable>
  );

  if (!label) return button;

  return (
    <View style={styles.action}>
      {button}
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center' },
  pressed: { transform: [{ scale: 0.94 }] },
  disabled: { opacity: 0.45 },
  action: { alignItems: 'center', gap: 8 },
  label: { color: CALL_TEXT_MUTED, fontSize: 13 },
});
