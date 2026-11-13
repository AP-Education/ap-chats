import { type AudioPlayer, type AudioSource, createAudioPlayer } from 'expo-audio';

import { useNativeCallStore } from '../store/native-call-store';

// Owns the players behind call chimes and tones. expo-audio 58 deactivates the shared
// AVAudioSession once a keepAudioSessionActive player is released and nothing of its own
// still plays — it does not see the call's WebRTC microphone, so releasing a chime mid-call
// silenced the caller about a second after answering. Players are therefore kept for as long
// as a call is up, and released only once no call remains and the last sound has finished:
// that release is what hands the session back to other apps after a hangup or busy tone.
const players = new Map<AudioSource, AudioPlayer>();
// Replays still rewinding, counted per player: a completion from an earlier playback
// must not let a release remove the player before its replay starts.
const starting = new Map<AudioPlayer, number>();
// Players whose last play() has not yet finished or failed.
const playing = new Set<AudioPlayer>();
// Players that reported an error while a replay was rewinding: playing them would
// leave them tracked as playing with no completion or error left to come.
const failedWhileStarting = new Set<AudioPlayer>();

function releaseWhenIdle(): void {
  if (useNativeCallStore.getState().call || starting.size > 0 || playing.size > 0) return;
  for (const player of players.values()) player.remove();
  players.clear();
}

function started(player: AudioPlayer): void {
  const remaining = (starting.get(player) ?? 1) - 1;
  if (remaining > 0) {
    starting.set(player, remaining);
  } else {
    starting.delete(player);
    failedWhileStarting.delete(player);
  }
}

function stopped(player: AudioPlayer): void {
  playing.delete(player);
  releaseWhenIdle();
}

function playerFor(source: AudioSource): AudioPlayer {
  const existing = players.get(source);
  if (existing) return existing;
  const player = createAudioPlayer(source, { keepAudioSessionActive: true });
  // A native playback failure arrives as a status error, without didJustFinish.
  player.addListener('playbackStatusUpdate', (status) => {
    if (status.error && starting.has(player)) failedWhileStarting.add(player);
    if (status.didJustFinish || status.error) stopped(player);
  });
  players.set(source, player);
  return player;
}

export function playCallSound(source: AudioSource): void {
  const player = playerFor(source);
  starting.set(player, (starting.get(player) ?? 0) + 1);
  player
    .seekTo(0)
    .then(() => {
      if (failedWhileStarting.has(player)) {
        started(player);
        releaseWhenIdle();
        return;
      }
      player.play();
      started(player);
      playing.add(player);
    })
    .catch((error: unknown) => {
      started(player);
      stopped(player);
      if (__DEV__) console.warn('[calls] sound failed', error);
    });
}

// The ending sound plays after the call is cleared; a call that ends in silence releases here.
useNativeCallStore.subscribe((state, previous) => {
  if (previous.call && !state.call) releaseWhenIdle();
});
