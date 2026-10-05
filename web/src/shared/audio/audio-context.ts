let shared: AudioContext | null = null;
let unlockArmed = false;

// One AudioContext reused by every in-app sound, unlocked once on the page's first pointer/key press — a passive socket-triggered sound (no gesture nearby) would otherwise stay silent on a freshly created, suspended context.
export function getSharedAudioContext(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  if (!shared) shared = new AudioContext();
  if (!unlockArmed) {
    unlockArmed = true;
    const unlock = () => void shared?.resume();
    window.addEventListener('pointerdown', unlock, { once: true, capture: true });
    window.addEventListener('keydown', unlock, { once: true, capture: true });
  }
  if (shared.state === 'suspended') void shared.resume();
  return shared;
}
