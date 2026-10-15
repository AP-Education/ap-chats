import { createContext, useContext } from 'react';

import type { MemberSummary } from '../types';

export interface MemberSheet {
  show: (member: MemberSummary) => void;
}

export const MemberSheetContext = createContext<MemberSheet | null>(null);

export function useMemberSheet(): MemberSheet {
  const value = useContext(MemberSheetContext);
  if (!value) {
    throw new Error('useMemberSheet must be used within MemberSheetProvider');
  }
  return value;
}
