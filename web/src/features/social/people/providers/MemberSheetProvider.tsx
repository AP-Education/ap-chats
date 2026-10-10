import { type PropsWithChildren, useMemo, useState } from 'react';

import { BottomSheet } from '@/shared/ui/BottomSheet';

import { MemberCard } from '../components/MemberProfile/MemberCard';
import { memberProfileLabel } from '../components/MemberProfile/memberProfileLabel';
import { type MemberSheet, MemberSheetContext } from '../stores/member-sheet-context';
import type { MemberSummary } from '../types';

// Mounted above the message rows so the sheet's touches never reach their swipe and long-press gestures.
export function MemberSheetProvider({ children }: PropsWithChildren) {
  // Kept after close so the sheet keeps its content through the exit animation.
  const [member, setMember] = useState<MemberSummary | null>(null);
  const [open, setOpen] = useState(false);

  const sheet = useMemo<MemberSheet>(
    () => ({
      show: (next) => {
        setMember(next);
        setOpen(true);
      },
    }),
    [],
  );

  const close = () => setOpen(false);

  return (
    <MemberSheetContext.Provider value={sheet}>
      {children}
      {member && (
        <BottomSheet
          open={open}
          onClose={close}
          aria-label={memberProfileLabel(member)}
          destroyOnHidden
        >
          <MemberCard member={member} onConversationOpen={close} />
        </BottomSheet>
      )}
    </MemberSheetContext.Provider>
  );
}
