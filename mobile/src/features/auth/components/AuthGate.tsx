import { StatusBar } from 'expo-status-bar';
import type { PropsWithChildren } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '../index';

/**
 * Owns sign-in for the mobile shell. Unlike web/src/app/auth/AuthStatus.tsx (a button
 * inside the app), the WebView can't safely drive a system-browser redirect itself, so
 * the native shell logs in first and only then reveals the WebView, feeding it a token
 * through the bridge (see features/webview). A no-op passthrough when OIDC isn't
 * configured yet, matching how web/src/app/providers/OidcProvider.tsx degrades today.
 */
export function AuthGate({ children }: PropsWithChildren) {
  const auth = useAuthStore();

  if (auth.status === 'unconfigured' || auth.status === 'signed-in') {
    return <>{children}</>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>AP Connect</Text>
      {auth.status === 'signing-in' ? (
        <ActivityIndicator size="large" color="#0c7d77" />
      ) : (
        <>
          <Text style={styles.description}>
            {auth.status === 'error'
              ? 'Не вдалося увійти. Спробуйте ще раз.'
              : 'Увійдіть через спільний AP-акаунт.'}
          </Text>
          <Button
            title="Увійти"
            onPress={() => void useAuthStore.getState().signIn()}
            color="#0c7d77"
          />
        </>
      )}
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 28,
    backgroundColor: '#f4f8f7',
  },
  title: { fontSize: 26, fontWeight: '700', color: '#0c7d77' },
  description: { fontSize: 16, lineHeight: 24, color: '#203333', textAlign: 'center' },
});
