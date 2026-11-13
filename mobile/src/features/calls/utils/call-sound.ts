import { type AudioPlayer, type AudioSource, createAudioPlayer } from 'expo-audio';

// One player per sound for the app's lifetime, rewound and replayed each time.
// expo-audio 58 deactivates the shared AVAudioSession once a player created with
// keepAudioSessionActive is released and nothing of its own still plays — it does
// not see the call's WebRTC microphone, so releasing a chime mid-call silenced the
// caller about a second after answering. A player that is never released keeps
// expo-audio from ever ending the call's session; CallKit/Telecom end it with the call.
const players = new Map<AudioSource, AudioPlayer>();

function playerFor(source: AudioSource): AudioPlayer {
  let player = players.get(source);
  if (!player) {
    player = createAudioPlayer(source, { keepAudioSessionActive: true });
    players.set(source, player);
  }
  return player;
}

export function playCallSound(source: AudioSource): void {
  const player = playerFor(source);
  player
    .seekTo(0)
    .then(() => player.play())
    .catch((error: unknown) => {
      if (__DEV__) console.warn('[calls] sound failed', error);
    });
}
