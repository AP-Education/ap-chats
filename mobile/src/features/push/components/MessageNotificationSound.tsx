import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import messageSound from '../../../../assets/sounds/message.wav';
import { useNativeCallStore } from '../../calls/store/native-call-store';

export function MessageNotificationSound({ request }: { request: number }) {
  // A finishing sound must not deactivate a CallKit session that started meanwhile.
  const player = useAudioPlayer(messageSound, {
    downloadFirst: true,
    keepAudioSessionActive: true,
  });
  const { isLoaded, error } = useAudioPlayerStatus(player);
  const handledRequest = useRef(0);

  useEffect(() => {
    if (__DEV__ && error) console.warn('[notifications] sound asset failed', error);
  }, [error]);

  useEffect(() => {
    if (!request || request === handledRequest.current || !isLoaded) return;
    handledRequest.current = request;
    if (AppState.currentState !== 'active' || useNativeCallStore.getState().call) return;
    let cancelled = false;

    async function play() {
      await setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' });
      if (cancelled || AppState.currentState !== 'active' || useNativeCallStore.getState().call)
        return;
      await player.seekTo(0);
      if (!cancelled && AppState.currentState === 'active' && !useNativeCallStore.getState().call) {
        player.play();
        if (__DEV__) console.log('[notifications] message sound playing');
      }
    }

    void play().catch((error: unknown) => {
      if (__DEV__) console.warn('[push] message sound failed', error);
    });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, player, request]);

  return null;
}
