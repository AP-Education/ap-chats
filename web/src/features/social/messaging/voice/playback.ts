let active: HTMLMediaElement | undefined;

export function stopAudioPlayback() {
  active?.pause();
  active = undefined;
}

export function claimAudioPlayback(player: HTMLMediaElement) {
  if (active && active !== player) active.pause();
  active = player;
}

export function releaseAudioPlayback(player: HTMLMediaElement) {
  if (active === player) active = undefined;
}
