import type { Translation } from '../translation';
import type { voice as source } from '../uk/voice';

export const voice = {
  errors: {
    callActive: 'Can’t record during a call.',
    interruptedByCall: 'Recording was interrupted by a call.',
    recordFailed: 'Couldn’t record the voice message.',
    invalid: 'The recording is empty, too short or over 20 MB.',
    interrupted: 'Recording was interrupted.',
    interruptedRetry: 'Recording was interrupted. Try again.',
    permissionDenied: 'No microphone access. Allow it in AP App settings.',
    notSaved: 'The recording wasn’t saved.',
    localUnavailable: 'The local recording is unavailable. Record the message again.',
    localIncomplete: 'The local recording is incomplete.',
    uploadFailed: 'Couldn’t upload the voice message.',
    uploadFailedStatus: 'Couldn’t upload the voice message ({{status}}).',
    otherConversation: 'This voice message belongs to another conversation.',
    apiMissing: 'The API address isn’t configured.',
    uploadCancelled: 'Upload cancelled.',
    transferFailed: 'Couldn’t transfer the file. Try again.',
  },
  fileName: 'Voice-{{stamp}}',
} satisfies Translation<typeof source>;
