import { useShellLocation } from '@ap-education/shell-sdk';
import { type PropsWithChildren, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useOverlay } from '@/shared/lib/overlay';
import { BottomSheet } from '@/shared/ui/BottomSheet';

import { MemberCard } from '../components/MemberProfile/MemberCard';
import { memberProfileLabel } from '../components/MemberProfile/memberProfileLabel';
import { type MemberSheet, MemberSheetContext } from '../stores/member-sheet-context';
import type { MemberSummary } from '../types';

// The profile and its role list swap in place, so the sheet must not jump between them.
const MEMBER_SHEET_HEIGHT = 'min(560px, 80dvh)';

// Mounted above the message rows so the sheet's touches never reach their swipe and long-press gestures.
export function MemberSheetProvider({ children }: PropsWithChildren) {
  const { t } = useTranslation('people');
  const { item: member, open, show, close } = useOverlay<MemberSummary>();

  // The sheet belongs to the page it was opened on, so any navigation closes it.
  const href = useShellLocation();
  const [lastHref, setLastHref] = useState(href);
  if (href !== lastHref) {
    setLastHref(href);
    close();
  }

  const sheet = useMemo<MemberSheet>(() => ({ show }), [show]);

  return (
    <MemberSheetContext.Provider value={sheet}>
      {children}
      {member && (
        <BottomSheet
          open={open}
          onClose={close}
          aria-label={memberProfileLabel(member, t)}
          height={MEMBER_SHEET_HEIGHT}
        >
          <MemberCard member={member} onConversationOpen={close} />
        </BottomSheet>
      )}
    </MemberSheetContext.Provider>
  );
}
