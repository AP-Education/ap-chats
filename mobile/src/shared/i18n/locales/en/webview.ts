import type { Translation } from '../../translation';
import type { webview as source } from '../uk/webview';

export const webview = {
  connectionError: {
    title: 'Can’t reach the server',
    description: 'Check your network and try again.',
    retry: 'Try again',
  },
} satisfies Translation<typeof source>;
