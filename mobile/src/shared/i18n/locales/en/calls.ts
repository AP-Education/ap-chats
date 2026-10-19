import type { Translation } from '../../translation';
import type { calls as source } from '../uk/calls';

export const calls = {
  call: 'Call',
  connecting: 'Connecting',
  ringing: 'Calling',
  incoming: 'Incoming call',
  decline: 'Decline',
  declineCall: 'Decline call',
  accept: 'Accept',
  acceptCall: 'Accept call',
  minimize: 'Minimize call',
  returnToCall: 'Return to call: {{title}}',
  microphone: 'Mic',
  camera: 'Camera',
  end: 'End',
  endCall: 'End call',
  mute: 'Mute microphone',
  unmute: 'Unmute microphone',
  cameraUnavailable: 'Camera unavailable',
  micMuted: 'Your microphone is off',
  answerFailed: {
    title: 'Couldn’t answer the call',
    signedOut: 'Sign in to the app to answer calls',
    unreachable: 'Check your connection and call back',
  },
  audio: {
    label: 'Audio',
    pick: 'Choose audio output',
    title: 'Audio output',
    speaker: 'Speaker',
    speakerOff: 'Turn off speaker',
    speakerOn: 'Turn on speaker',
    earpiece: 'Phone',
    wired: 'Headphones',
    bluetooth: 'Bluetooth',
    cancel: 'Cancel',
  },
  readiness: {
    checking: 'Checking',
    fullScreen: {
      title: 'To wake the screen for calls',
      description:
        'Android shows an incoming call full screen on a locked phone only with the full-screen notifications permission.',
      missedTitle: 'The call didn’t turn the screen on',
      missedDescription:
        'The phone was asleep, so Android showed the call only as a notification. Allow full-screen notifications, and the next call will turn the screen on.',
      action: 'Open settings',
    },
    unrestricted: {
      title: 'To get calls right away',
      description:
        'Let AP App run in the background without restrictions, otherwise Android holds back calls and messages while the phone sleeps.',
      action: 'Allow',
    },
    later: 'Later',
  },
} satisfies Translation<typeof source>;
