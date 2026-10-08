import type { AudioPort, AudioRoute } from 'expo-callkit-telecom';

import { useNativeCallStore } from '../store/native-call-store';
import type { AudioOutput, AudioOutputKind, CallAudioRoute } from '../types';
import type { loadCallKitModule } from './callkit-module';

const KIND_BY_PORT: Record<string, AudioOutputKind> = {
  builtInSpeaker: 'speaker',
  builtInReceiver: 'earpiece',
  headphones: 'wired',
  usbAudio: 'wired',
  lineOut: 'wired',
  bluetoothHFP: 'bluetooth',
  bluetoothA2DP: 'bluetooth',
  bluetoothLE: 'bluetooth',
  carAudio: 'bluetooth',
};

// Same order the library picks a non-speaker endpoint in, so the picker names the device it will use.
const PRIVATE_PRIORITY: AudioOutputKind[] = ['bluetooth', 'wired', 'earpiece'];

function toAudioOutput(port: AudioPort): AudioOutput | undefined {
  const kind = KIND_BY_PORT[port.portType];
  return kind && { kind, name: port.portName };
}

function bestPrivateOutput(outputs: AudioOutput[]): AudioOutput | undefined {
  for (const kind of PRIVATE_PRIORITY) {
    const match = outputs.find((output) => output.kind === kind);
    if (match) return match;
  }
  return undefined;
}

/** iOS reports only the active route, so the private output is known once audio has used it;
 * Android also lists every available endpoint. */
export function readAudioRoute(route: AudioRoute, availableRoutes?: AudioPort[]): CallAudioRoute {
  const current = route.outputs.map(toAudioOutput).find(Boolean);
  const available = (availableRoutes ?? []).map(toAudioOutput).filter((output) => !!output);

  const isPrivate = current && current.kind !== 'speaker';
  const privateOutput = bestPrivateOutput(isPrivate ? [current, ...available] : available);

  return { current, private: privateOutput };
}

/** Keeps the last known private device while on speaker, since iOS stops reporting it there. */
export function syncAudioRoute(route: AudioRoute, availableRoutes?: AudioPort[]): void {
  const call = useNativeCallStore.getState().call;
  if (!call) return;

  const next = readAudioRoute(route, availableRoutes);
  const audioRoute = { current: next.current, private: next.private ?? call.audioRoute?.private };

  useNativeCallStore.getState().updateCall({ audioRoute });
}

// A call's first route comes with audio activation, which emits no route change.
export function syncCurrentAudioRoute(
  CallKit: NonNullable<Awaited<ReturnType<typeof loadCallKitModule>>>,
): void {
  const audio = CallKit.getAudioSession();
  syncAudioRoute(audio.currentRoute, audio.availableRoutes);
}

/** Speaker is the only route the library can force; everything else is the OS's best private device. */
export function selectAudioOutput(
  CallKit: NonNullable<Awaited<ReturnType<typeof loadCallKitModule>>>,
  kind: AudioOutputKind,
): void {
  CallKit.setAudioSessionPortOverride(kind === 'speaker');
}
