import type { ReactNode, RefObject } from 'react';

import { useMessageActionScope } from '@/features/social/messaging/components/MessageRow/MessageActionScope';
import { MessageReadContent } from '@/features/social/messaging/components/MessageRow/MessageReadContent';
import type { StarMeBlock as AnswerBlock } from '@/features/social/messaging/types';

import { StarMeBlock } from './StarMeBlock';

export function StarMeMessageBlock({
  block,
  contentRef,
  meta,
}: {
  block: AnswerBlock;
  contentRef?: RefObject<HTMLDivElement | null>;
  meta?: ReactNode;
}) {
  const { item } = useMessageActionScope();
  const isPrivateAnswer = item.message.privateToMe && item.message.assistantAnswer;
  if (!isPrivateAnswer) return null;

  return (
    <StarMeBlock questionId={block.questionId} showName={false}>
      <MessageReadContent contentRef={contentRef} jumboEmoji={0} meta={meta} />
    </StarMeBlock>
  );
}
