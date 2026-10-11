import { lazy, Suspense } from 'react';

import { EmojiTabSkeleton } from '@/features/social/messaging/components/MessageComposer/picker/EmojiTabSkeleton';

// The composer's emoji grid, loaded on first use like there: the data set stays out of the chat bundle.
const EmojiTab = lazy(() =>
  import('@/features/social/messaging/components/MessageComposer/picker/EmojiTab').then(
    (module) => ({ default: module.EmojiTab }),
  ),
);

export function ReactionGrid({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <Suspense fallback={<EmojiTabSkeleton />}>
      <EmojiTab onPick={onPick} />
    </Suspense>
  );
}
