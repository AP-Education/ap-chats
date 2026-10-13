import type { PropsWithChildren } from 'react';

import { useProfilesFollowRoles } from '../hooks/useProfilesFollowRoles';
import { MemberSheetProvider } from './MemberSheetProvider';

/** What people keeps running while Chats is open: current profiles and the profile sheet. */
export function PeopleProvider({ children }: PropsWithChildren) {
  useProfilesFollowRoles();

  return <MemberSheetProvider>{children}</MemberSheetProvider>;
}
