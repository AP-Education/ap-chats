import type { Message, MessageBlock } from '@/features/social/messaging/types';

/** Already stored private answers from an older API keep the same block presentation. */
export function starMeMessageBlocks(message: Message): MessageBlock[] {
  const blocks = message.blocks ?? [];
  const isPrivateAnswer = message.privateToMe && message.assistantAnswer;
  if (!isPrivateAnswer) return blocks.filter((block) => block.type !== 'star-me');

  const hasAnswerBlock = blocks.some((block) => block.type === 'star-me');
  if (hasAnswerBlock) return blocks;

  return [{ type: 'star-me', questionId: message.replyToMessageId ?? undefined }, ...blocks];
}
