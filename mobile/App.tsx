import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

const webUrl = process.env.EXPO_PUBLIC_WEB_URL;

export default function App() {
  if (!webUrl) {
    return (
      <View style={styles.setup}>
        <Text style={styles.title}>AP Connect</Text>
        <Text style={styles.description}>
          Вкажіть EXPO_PUBLIC_WEB_URL у mobile/.env, щоб відкрити вебзастосунок.
        </Text>
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView source={{ uri: webUrl }} style={styles.webview} />
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  webview: { flex: 1 },
  setup: { flex: 1, justifyContent: 'center', padding: 28, backgroundColor: '#f4f8f7' },
  title: { fontSize: 26, fontWeight: '700', color: '#0c7d77', marginBottom: 12 },
  description: { fontSize: 16, lineHeight: 24, color: '#203333' },
});
