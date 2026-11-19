import type { Translation } from '../translation';
import type { voice as source } from '../uk/voice';

export const voice = {
  recording: {
    region: 'Voice message recording',
    cancel: 'Cancel recording',
    playPreview: 'Play recording',
    pausePreview: 'Pause playback',
    duration: 'Recording length',
    slideToCancel: 'Cancel',
    pause: 'Pause recording',
    resume: 'Resume recording',
    stop: 'Stop recording',
    stopTitle: 'Stop and listen',
    status: {
      requesting: 'Connecting microphone…',
      recording: 'Recording',
      paused: 'Recording paused',
      stopping: 'Preparing recording…',
      ready: 'Review your recording',
      error: 'Recording unavailable',
    },
    busy: 'Recording isn’t available during a call.',
    previewFailed: 'Couldn’t play the recording. Try again.',
    hint: {
      holding: 'Release to send',
      ready: 'Listen or send',
      locked: 'Hands-free recording · up to 10 min',
    },
  },
  action: {
    record: 'Record voice message',
    retry: 'Record again',
    hold: 'Hold to record',
    send: 'Send voice message',
    title: 'Hold to record · swipe up for hands-free',
    gestureHint:
      'Hold and release to send. Swipe left to cancel, up to lock recording. A short tap starts hands-free recording.',
  },
  message: {
    region: 'Voice message',
    play: 'Play voice message',
    pause: 'Pause voice message',
    position: 'Voice message position',
    positionValue: '{{elapsed}} of {{duration}}',
    remaining: '{{time}} left',
    duration: 'Length {{time}}',
    speed: 'Playback speed',
    download: 'Download {{name}}',
    loading: 'Loading voice message',
    playFailed: 'Couldn’t play · Retry',
    audio: 'Voice message audio',
  },
  pending: {
    sending: 'Sending voice message',
    failed: 'Couldn’t upload voice message',
    progress: 'Uploading voice message',
    cancel: 'Cancel sending voice message',
  },
  errors: {
    tooLarge: 'The recording is over 20 MB. Record a shorter message.',
    interrupted: 'Recording was interrupted. Try again.',
    permissionDenied: 'No microphone access. Allow it in your browser settings.',
    microphoneUnavailable:
      'Couldn’t open the microphone. Check that it’s available and supports recording.',
    stopFailed: 'Couldn’t finish recording. Try again.',
    interruptedByCall: 'Recording was interrupted by a call. Try again after it ends.',
    tooShort: 'The recording is too short. It needs to be at least half a second.',
    nativeUnsupported: 'Recording isn’t available in this version of the app. Update AP App.',
    addToDraftFailed: 'Couldn’t add the voice message to the draft.',
  },
  fileName: 'Voice-{{stamp}}',
} satisfies Translation<typeof source>;
