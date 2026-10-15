import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { CALL_TEXT_MUTED } from '../callTheme';
import { CallSurfaceBackground } from './CallSurfaceBackground';

interface CallWindowStatusProps {
  title: string;
  description?: string;
  loading?: boolean;
}

/** What the call window shows while it has no call to draw: one on its way, or why none came. */
export function CallWindowStatus({ title, description, loading }: CallWindowStatusProps) {
  return (
    <View style={styles.fill}>
      <CallSurfaceBackground />
      <StatusBar style="light" />
      <View style={styles.content}>
        {loading && <ActivityIndicator color="#fff" />}
        <Text style={styles.title}>{title}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  title: { color: '#fff', fontSize: 20, fontWeight: '600', textAlign: 'center' },
  description: { color: CALL_TEXT_MUTED, fontSize: 15, textAlign: 'center' },
});
