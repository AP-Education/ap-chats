import type { PropsWithChildren } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PortalProvider } from 'react-native-teleport';

/**
 * Root provider stack — mirrors web/src/app/providers/AppProviders.tsx. Grows here as
 * native-only concerns (push, calls) need their own providers (e.g. a CallKit context).
 */
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <PortalProvider>{children}</PortalProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
