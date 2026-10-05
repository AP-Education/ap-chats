import { getSharedAudioContext } from '@/shared/audio/audio-context';
import { scheduleBell } from '@/shared/audio/tone';

// Same struck-bell voice as the call ringtone, one sonic identity across the app.
const NOTES = [659.25, 987.77]; // E5 -> B5
const NOTE_SPACING_SECONDS = 0.1;
const NOTE_GAIN = 0.16;
const NOTE_DECAY_SECONDS = 0.4;

export function playMessageBloop(): void {
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'notifications/message-sound' }));
    return;
  }
  const context = getSharedAudioContext();
  if (!context) return;

  const master = context.createGain();
  master.connect(context.destination);

  // Faint slapback echo, subtler than the ringtone since this fires far more often.
  const delay = context.createDelay(1);
  delay.delayTime.value = 0.16;
  const feedback = context.createGain();
  feedback.gain.value = 0.12;
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(master);

  const now = context.currentTime;
  NOTES.forEach((frequency, index) => {
    scheduleBell(context, [master, delay], {
      frequency,
      startTime: now + index * NOTE_SPACING_SECONDS,
      gain: NOTE_GAIN,
      decay: NOTE_DECAY_SECONDS,
    });
  });

  // Disconnects this bloop's own nodes; the shared context itself stays alive for the session.
  const disconnectAfterMs = (NOTES.length * NOTE_SPACING_SECONDS + NOTE_DECAY_SECONDS + 0.5) * 1000;
  setTimeout(() => {
    master.disconnect();
    delay.disconnect();
    feedback.disconnect();
  }, disconnectAfterMs);
}
