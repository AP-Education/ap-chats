import { createContext, useContext } from 'react';

import type { CurrentUserState } from '../types';

export const CurrentUserContext = createContext<CurrentUserState | null>(null);

export function useCurrentUser(): CurrentUserState {
  const value = useContext(CurrentUserContext);
  if (!value) {
    throw new Error('useCurrentUser must be used within CurrentUserProvider');
  }
  return value;
}
