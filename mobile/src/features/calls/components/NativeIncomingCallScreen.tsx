import { StatusBar } from 'expo-status-bar';
import { PhoneCall, PhoneDisconnect } from 'phosphor-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CALL_TEXT_MUTED } from '../callTheme';
import { useNativeCallStore } from '../store/native-call-store';
import { withCallKit } from '../utils/callkit-module';
import { CallAvatar } from './CallAvatar';
import { CallControlButton } from './CallControlButton';
import { CallSurfaceBackground } from './CallSurfaceBackground';

/**
 * The in-app "ringing" screen — the same CallSession the system's own incoming-
 * call UI is showing, just drawn in-app for whoever opened the app directly
 * instead of answering from the lock screen/system UI. answerCall()/endCall()
 * are the documented programmatic equivalents of the system UI's own buttons:
 * CallAnsweredEvent (answerCall.ts) fires the same either way. Mirrors web's
 * IncomingCallCard in its phone layout.
 */
export function NativeIncomingCallScreen() {
  const call = useNativeCallStore((state) => state.call);

  if (!call || call.status !== 'ringing') return null;

  const name = call.caller.displayName ?? 'Дзвінок';

  return (
    <View style={styles.fill}>
      <CallSurfaceBackground />
      <StatusBar style="light" />
      <SafeAreaView style={styles.content}>
        <View style={styles.caller}>
          <CallAvatar name={name} size={120} ringing />
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.status}>Вхідний дзвінок</Text>
        </View>

        <View style={styles.actions}>
          <CallControlButton
            icon={PhoneDisconnect}
            iconWeight="fill"
            accessibilityLabel="Відхилити дзвінок"
            label="Відхилити"
            size={72}
            tone="danger"
            onPress={() => withCallKit((CallKit) => CallKit.endCall(call.sessionId))}
          />
          <CallControlButton
            icon={PhoneCall}
            iconWeight="fill"
            accessibilityLabel="Прийняти дзвінок"
            label="Прийняти"
            size={72}
            tone="accept"
            onPress={() => withCallKit((CallKit) => CallKit.answerCall(call.sessionId))}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill, zIndex: 20 },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 24 },
  caller: { flex: 1, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  name: { marginTop: 32, color: '#fff', fontSize: 28, fontWeight: '600' },
  status: { marginTop: 6, color: CALL_TEXT_MUTED, fontSize: 15 },
  actions: { flexDirection: 'row', gap: 88, paddingBottom: 48 },
});
