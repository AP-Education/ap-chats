import {
  type EntryViewProps,
  TimelineEntry,
  TimelineEntryBubble,
} from '@ap-education/timeline/react';
import { AiText } from '@ap-education/ui';
import type { PropsWithChildren } from 'react';

import { useConversationScope } from '@/features/social/conversation-scope/store';

import type { AnswerEntry } from '../../answers';
import { useAskStarMe } from '../../hooks/useAskStarMe';
import { StarMeBlock } from '../StarMeBlock/StarMeBlock';
import { StarMeFailureNote } from './StarMeFailureNote';

/** StarMe's answer on its way, in StarMe's run: composing, or why not, told to the asker alone. */
export function StarMeAnswer({ entry, status }: EntryViewProps<AnswerEntry>) {
  const { workspaceId, channelId } = useConversationScope();
  const ask = useAskStarMe(workspaceId);
  const { questionId, failure } = entry.payload;

  if (status === 'failed' && failure) {
    return (
      <AnswerRow role="alert" questionId={questionId}>
        <StarMeFailureNote failure={failure} onRetry={() => ask({ channelId, questionId })} />
      </AnswerRow>
    );
  }

  return (
    <AnswerRow role="status" questionId={questionId}>
      <AiText thinking>Думаю над відповіддю</AiText>
    </AnswerRow>
  );
}

// Marked to arrive: its run rises in once, as StarMe's answer always came in below the history.
function AnswerRow({
  role,
  questionId,
  children,
}: PropsWithChildren<{ role: 'status' | 'alert'; questionId: string }>) {
  return (
    <TimelineEntry
      side="start"
      status={role === 'alert' ? 'failed' : undefined}
      role={role}
      data-arrives
    >
      <TimelineEntryBubble>
        <StarMeBlock questionId={questionId}>{children}</StarMeBlock>
      </TimelineEntryBubble>
    </TimelineEntry>
  );
}
