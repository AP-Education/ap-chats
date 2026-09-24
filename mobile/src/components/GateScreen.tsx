import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, gradient, radius, spacing } from '../shell/theme';

export interface GateAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}

export interface GateScreenProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  /** Raw context (e.g. the backend/OAuth error message) — shown smaller, below description. */
  detail?: string;
  actions?: GateAction[];
  loading?: boolean;
}

// Shared full-screen "state" layout — sign-in, permission priming, connection error,
// setup instructions — anything native shows before the WebView takes over. One place
// owns the visual language so those screens can't drift apart from each other.
export function GateScreen({
  icon,
  title,
  description,
  detail,
  actions,
  loading,
}: GateScreenProps) {
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.fill}
    >
      <SafeAreaView style={styles.center}>
        <View style={styles.card}>
          <View style={styles.content}>
            <View style={styles.iconBadge}>
              {loading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name={icon} size={40} color={colors.primary} />
              )}
            </View>
            <Text style={styles.title}>{title}</Text>
            {description ? <Text style={styles.description}>{description}</Text> : null}
            {detail ? (
              <View style={styles.detailChip}>
                <Text style={styles.detailText}>{detail}</Text>
              </View>
            ) : null}
          </View>

          {!loading && actions && actions.length > 0 ? (
            <View style={styles.actions}>
              {actions.map((action) => {
                const secondary = action.variant === 'secondary';
                return (
                  <Pressable
                    key={action.label}
                    onPress={action.onPress}
                    style={({ pressed }) => [
                      secondary ? styles.secondaryButton : styles.primaryButton,
                      pressed &&
                        (secondary ? styles.secondaryButtonPressed : styles.primaryButtonPressed),
                    ]}
                  >
                    <Text style={secondary ? styles.secondaryButtonText : styles.primaryButtonText}>
                      {action.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
        <StatusBar style="dark" />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.md },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#0c2b28',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  content: { alignItems: 'center', gap: spacing.sm },
  iconBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'center' },
  description: { fontSize: 15, lineHeight: 22, color: colors.textSecondary, textAlign: 'center' },
  detailChip: {
    backgroundColor: colors.primaryBg,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  detailText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  actions: { width: '100%', gap: spacing.sm, marginTop: spacing.lg },
  primaryButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  primaryButtonPressed: { opacity: 0.85 },
  primaryButtonText: { color: colors.surface, fontSize: 16, fontWeight: '600' },
  secondaryButton: {
    width: '100%',
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  secondaryButtonPressed: { backgroundColor: colors.primaryBg },
  secondaryButtonText: { color: colors.textSecondary, fontSize: 15, fontWeight: '500' },
});
