import { StarMePrivateHeading } from '@/features/star-me/components/StarMePrivateHeading/StarMePrivateHeading';

import { useMessageActionScope } from './MessageActionScope';

export function PrivateMessageLabel() {
  const { item } = useMessageActionScope();
  if (!item.message.privateToMe) return null;

  return <StarMePrivateHeading showName={!item.message.assistantAnswer} />;
}
