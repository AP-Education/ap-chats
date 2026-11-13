import { type AudioPlayer, type AudioSource, createAudioPlayer } from 'expo-audio';

import { useNativeCallStore } from '../store/native-call-store';

// Owns the players behind call chimes and tones. expo-audio 58 deactivates the shared
// AVAudioSession once a keepAudioSessionActive player is released and nothing of its own
// still plays — it does not see the call's WebRTC microphone, so releasing a chime mid-call
// silenced the caller about a second after answering. Players are therefore kept for as long
// as a call is up, and released only once no call remains and the last sound has finished:
// that release is what hands the session back to other apps after a hangup or busy tone.
const players = new Map<AudioSource, AudioPlayer>();
const playing = new Set<AudioPlayer>();

function releaseWhenIdle(): void {
  if (useNativeCallStore.getState().call || playing.size > 0) return;
  for (const player of players.values()) player.remove();
  players.clear();
}

function finished(player: AudioPlayer): void {
  playing.delete(player);
  releaseWhenIdle();
}

function playerFor(source: AudioSource): AudioPlayer {
  const existing = players.get(source);
  if (existing) return existing;
  const player = createAudioPlayer(source, { keepAudioSessionActive: true });
  player.addListener('playbackStatusUpdate', (status) => {
    if (status.didJustFinish) finished(player);
  });
  players.set(source, player);
  return player;
}

export function playCallSound(source: AudioSource): void {
  const player = playerFor(source);
  playing.add(player);
  player
    .seekTo(0)
    .then(() => player.play())
    .catch((error: unknown) => {
      finished(player);
      if (__DEV__) console.warn('[calls] sound failed', error);
    });
}

// The ending sound plays after the call is cleared; a call that ends in silence releases here.
useNativeCallStore.subscribe((state, previous) => {
  if (previous.call && !state.call) releaseWhenIdle();
});
