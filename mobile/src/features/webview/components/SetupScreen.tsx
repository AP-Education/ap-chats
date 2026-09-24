import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function SetupScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>AP Connect</Text>
      <Text style={styles.description}>
        Вкажіть EXPO_PUBLIC_WEB_URL у mobile/.env, щоб відкрити вебзастосунок.
      </Text>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 28, backgroundColor: '#f4f8f7' },
  title: { fontSize: 26, fontWeight: '700', color: '#0c7d77', marginBottom: 12 },
  description: { fontSize: 16, lineHeight: 24, color: '#203333' },
});
