import { PhoneCall, PhoneDisconnect } from 'phosphor-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNativeCallStore } from '../store/native-call-store';
import { loadCallKitModule } from '../utils/callkit-module';
import { CallSurfaceBackground } from './CallSurfaceBackground';

/**
 * The in-app "ringing" screen — the same CallSession the system's own incoming-
 * call UI is showing, just drawn in-app for whoever opened the app directly
 * instead of answering from the lock screen/system UI. answerCall()/endCall()
 * are the documented programmatic equivalents of the system UI's own buttons:
 * CallAnsweredEvent (answerCall.ts) fires the same either way. Icons match
 * web/'s IncomingCallCard (phosphor-react-native, same set as web's
 * @phosphor-icons/react).
 */
export function NativeIncomingCallScreen() {
  const call = useNativeCallStore((state) => state.call);

  if (!call || call.status !== 'ringing') return null;

  return (
    <View style={styles.fill}>
      <CallSurfaceBackground />
      <SafeAreaView style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>
            {(call.caller.displayName ?? '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{call.caller.displayName ?? 'Дзвінок'}</Text>
        <Text style={styles.status}>Вхідний дзвінок</Text>

        <View style={styles.actions}>
          <View style={styles.action}>
            <Pressable
              style={[styles.circleButton, styles.decline]}
              onPress={() =>
                void loadCallKitModule().then((CallKit) => CallKit?.endCall(call.sessionId))
              }
            >
              <PhoneDisconnect size={28} color="#fff" weight="fill" />
            </Pressable>
            <Text style={styles.actionLabel}>Скинути</Text>
          </View>
          <View style={styles.action}>
            <Pressable
              style={[styles.circleButton, styles.accept]}
              onPress={() =>
                void loadCallKitModule().then((CallKit) => CallKit?.answerCall(call.sessionId))
              }
            >
              <PhoneCall size={28} color="#fff" weight="fill" />
            </Pressable>
            <Text style={styles.actionLabel}>Прийняти</Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill, zIndex: 20 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  avatar: {
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
  },
  avatarInitial: { fontSize: 44, fontWeight: '700', color: '#fff' },
  name: { fontSize: 22, fontWeight: '700', color: '#fff' },
  status: { fontSize: 14, color: 'rgba(255, 255, 255, 0.65)', marginTop: 4 },
  actions: {
    flexDirection: 'row',
    gap: 56,
    marginTop: 56,
  },
  action: { alignItems: 'center', gap: 10 },
  circleButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decline: { backgroundColor: '#d92d20' },
  accept: { backgroundColor: '#1f9254' },
  actionLabel: { fontSize: 13, color: 'rgba(255, 255, 255, 0.65)' },
});
