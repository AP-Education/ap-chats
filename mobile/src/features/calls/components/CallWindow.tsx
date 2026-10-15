import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { closeCallWindow, openChatsFromCallWindow } from '../../../../modules/call-window';
import { ErrorBoundary } from '../../../shell/ErrorBoundary';
import { CALL_PALETTE } from '../callTheme';
import { useNativeCallStore } from '../store/native-call-store';
import { CallRuntime } from './CallRuntime';
import { NativeInCallScreen } from './NativeInCallScreen';
import { NativeIncomingCallScreen } from './NativeIncomingCallScreen';

// Answering from the lock screen may start the app cold: the session takes a moment to restore.
const RESTORE_WAIT_MS = 15_000;

/**
 * The "call" root, alone in Android's CallActivity over the lock screen: a call and nothing else,
 * so a locked phone never shows the chats. It stays behind them until the call ends.
 */
export function CallWindow() {
  const call = useNativeCallStore((state) => state.call);
  const hadCall = useRef(false);

  useEffect(() => {
    if (call) {
      hadCall.current = true;
      return;
    }
    if (hadCall.current) {
      closeCallWindow();
      return;
    }
    const restoreWait = setTimeout(closeCallWindow, RESTORE_WAIT_MS);
    return () => clearTimeout(restoreWait);
  }, [call]);

  function leaveForChats() {
    useNativeCallStore.getState().minimize();
    openChatsFromCallWindow();
  }

  return (
    <SafeAreaProvider>
      <View style={styles.window}>
        <CallRuntime />
        <ErrorBoundary label="call-window-incoming">
          <NativeIncomingCallScreen />
        </ErrorBoundary>
        <ErrorBoundary label="call-window-in-call">
          <NativeInCallScreen onLeaveWindow={leaveForChats} />
        </ErrorBoundary>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  window: { flex: 1, backgroundColor: CALL_PALETTE.ink },
});
