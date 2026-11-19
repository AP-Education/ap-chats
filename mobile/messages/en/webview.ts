import type { Translation } from '../translation';
import type { webview as source } from '../uk/webview';

export const webview = {
  filePreview: {
    title: 'File',
    close: 'Close',
    errorTitle: 'Could not open the file',
    errorDescription: 'Try again or return to the conversation.',
  },
  setup: {
    title: 'Set the web app address',
    description: 'Set EXPO_PUBLIC_WEB_URL in mobile/.env to open AP App.',
  },
  connectionError: {
    title: 'Can’t reach the server',
    description: 'Check your network and try again.',
    retry: 'Try again',
  },
} satisfies Translation<typeof source>;
