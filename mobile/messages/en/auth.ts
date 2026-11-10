import type { Translation } from '../translation';
import type { auth as source } from '../uk/auth';

export const auth = {
  signingIn: 'Signing in',
  signingOut: 'Signing out',
  signOutFailed: {
    title: 'Couldn’t finish signing out',
    description: 'Try again to finish signing out of your shared AP account.',
    retry: 'Retry sign out',
    signIn: 'Sign in',
  },
  signInFailed: {
    title: 'Couldn’t sign in',
    description: 'Try again in a minute.',
    retry: 'Try again',
  },
  signIn: {
    title: 'Sign in to AP App',
    description: 'One click with your shared AP account and you are in the chat with your team.',
    action: 'Sign in',
  },
} satisfies Translation<typeof source>;
