import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { closeCallWindow, openChatsFromCallWindow } from '../../../../modules/call-window';
import { ErrorBoundary } from '../../../shell/ErrorBoundary';
import { CALL_PALETTE } from '../callTheme';
import { type AnswerFailure, useAnswerFailureStore } from '../store/answer-failure-store';
import { useNativeCallStore } from '../store/native-call-store';
import { CallRuntime } from './CallRuntime';
import { CallWindowStatus } from './CallWindowStatus';
import { NativeInCallScreen } from './NativeInCallScreen';
import { NativeIncomingCallScreen } from './NativeIncomingCallScreen';

// Answering from the lock screen may start the app cold: the session takes a moment to restore.
const RESTORE_WAIT_MS = 15_000;
const FAILURE_NOTICE_MS = 3_500;

const FAILURE_REASONS: Record<AnswerFailure, string> = {
  'signed-out': 'Увійди в застосунок, щоб відповідати на дзвінки',
  unreachable: "Перевір з'єднання і передзвони",
};

/**
 * The "call" root, alone in Android's CallActivity over the lock screen: a call and nothing else,
 * so a locked phone never shows the chats. It stays behind them until the call ends.
 */
export function CallWindow() {
  const call = useNativeCallStore((state) => state.call);
  const answerFailure = useAnswerFailureStore((state) => state.failure);
  const hadCall = useRef(false);

  useEffect(() => {
    if (call) {
      hadCall.current = true;
      return;
    }
    const wait = answerFailure ? FAILURE_NOTICE_MS : hadCall.current ? 0 : RESTORE_WAIT_MS;
    if (wait === 0) {
      closeCallWindow();
      return;
    }
    const closing = setTimeout(closeCallWindow, wait);
    return () => clearTimeout(closing);
  }, [call, answerFailure]);

  function leaveForChats() {
    useNativeCallStore.getState().minimize();
    openChatsFromCallWindow();
  }

  return (
    <SafeAreaProvider>
      <View style={styles.window}>
        <CallRuntime />
        {!call &&
          (answerFailure ? (
            <CallWindowStatus
              title="Не вдалося прийняти дзвінок"
              description={FAILURE_REASONS[answerFailure]}
            />
          ) : (
            <CallWindowStatus title="З'єднання" loading />
          ))}
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
