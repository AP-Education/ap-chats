import type { Translation } from '../translation';
import type { webview as source } from '../uk/webview';

export const webview = {
  filePreview: {
    title: 'File',
    close: 'Close',
    errorTitle: 'Could not open the file',
    errorDescription: 'Try again or return to the conversation.',
  },
  connectionError: {
    title: 'Can’t reach the server',
    description: 'Check your network and try again.',
    retry: 'Try again',
  },
} satisfies Translation<typeof source>;
