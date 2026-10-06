import { createContext, useContext } from 'react';

export interface CurrentUserProfile {
  name?: string;
  email?: string;
  picture?: string;
  sub?: string;
}

export type CurrentUserState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'signed-out'; retry: boolean; signIn: () => void }
  | {
      status: 'signed-in';
      accessToken: string;
      idToken?: string;
      queryIdentity: string;
      profile?: CurrentUserProfile;
      signOut: () => void;
      refreshAccessToken?: () => Promise<string>;
    };

export const CurrentUserContext = createContext<CurrentUserState | null>(null);

export function useCurrentUser(): CurrentUserState {
  const value = useContext(CurrentUserContext);
  if (!value) {
    throw new Error('useCurrentUser must be used within the shell');
  }
  return value;
}
