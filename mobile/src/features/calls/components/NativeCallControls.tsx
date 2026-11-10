import {
  type Icon,
  Microphone,
  MicrophoneSlash,
  PhoneX,
  VideoCameraSlash,
} from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text } from 'react-native';

import { CALL_GLASS } from '../callTheme';
import { useNativeCallStore } from '../store/native-call-store';
import { withCallKit } from '../utils/callkit-module';
import { CallControlButton, type CallControlTone } from './CallControlButton';

const MICROPHONE = {
  live: { icon: Microphone, tone: 'glass' },
  muted: { icon: MicrophoneSlash, tone: 'pressed' },
} as const satisfies Record<'live' | 'muted', { icon: Icon; tone: CallControlTone }>;

interface ControlProps {
  size: number;
  iconSize?: number;
  label?: string;
}

function useMuted() {
  return useNativeCallStore((state) => state.call?.isMuted ?? false);
}

// Through CallKit rather than local state: the system call UI and ours share one
// path, and the store updates from CallKit's own SetMuted event.
function toggleMute() {
  const call = useNativeCallStore.getState().call;
  if (!call) return;
  withCallKit((CallKit) => CallKit.setMuted(call.sessionId, !call.isMuted));
}

export function MuteControl(props: ControlProps) {
  const { t } = useTranslation('calls');
  const muted = useMuted();
  const state = muted ? MICROPHONE.muted : MICROPHONE.live;
  const accessibilityLabel = muted ? t(($) => $.unmute) : t(($) => $.mute);

  return (
    <CallControlButton
      {...state}
      accessibilityLabel={accessibilityLabel}
      {...props}
      onPress={toggleMute}
    />
  );
}

/** No video in the native layer yet: shown disabled rather than omitted, so the
 * control row keeps its shape the day video lands. */
export function CameraPlaceholderControl(props: ControlProps) {
  const { t } = useTranslation('calls');

  return (
    <CallControlButton
      icon={VideoCameraSlash}
      accessibilityLabel={t(($) => $.cameraUnavailable)}
      disabled
      {...props}
    />
  );
}

export function EndCallControl({ wide, ...props }: ControlProps & { wide?: boolean }) {
  const { t } = useTranslation('calls');

  function endCall() {
    const call = useNativeCallStore.getState().call;
    if (!call) return;
    withCallKit((CallKit) => CallKit.endCall(call.sessionId));
  }

  return (
    <CallControlButton
      icon={PhoneX}
      iconWeight="fill"
      tone="danger"
      accessibilityLabel={t(($) => $.endCall)}
      wide={wide}
      {...props}
      onPress={endCall}
    />
  );
}

/** Always laid out, only shown when muted: toggling the mic never moves the stage. */
export function MutedMicrophoneHint() {
  const { t } = useTranslation('calls');
  const muted = useMuted();

  return (
    <Pressable
      style={[styles.hint, !muted && styles.hidden]}
      disabled={!muted}
      accessibilityElementsHidden={!muted}
      importantForAccessibility={muted ? 'auto' : 'no-hide-descendants'}
      accessibilityRole="button"
      accessibilityLabel={t(($) => $.unmute)}
      onPress={toggleMute}
    >
      <MicrophoneSlash size={14} color="#fff" weight="fill" />
      <Text style={styles.hintText}>{t(($) => $.micMuted)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: CALL_GLASS,
  },
  hintText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  hidden: { opacity: 0 },
});
