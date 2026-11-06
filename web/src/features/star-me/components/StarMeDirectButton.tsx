import { SparkleIcon } from '@phosphor-icons/react';
import { Button, message } from 'antd';

import { useOpenDirectMessage } from '@/features/social/direct-messages/hooks/useOpenDirectMessage';

import { useStarMe } from '../hooks/useStarMe';

export function StarMeDirectButton({
  workspaceId,
  onNavigate,
}: {
  workspaceId: string;
  onNavigate?: () => void;
}) {
  const starMe = useStarMe(workspaceId);
  const conversation = useOpenDirectMessage(workspaceId);
  if (!starMe) return null;
  const memberId = starMe.memberId;

  async function open() {
    try {
      await conversation.open(memberId);
      onNavigate?.();
    } catch {
      void message.error('Не вдалося відкрити StarMe. Спробуйте ще раз.');
    }
  }

  return (
    <Button
      block
      icon={<SparkleIcon size={20} />}
      loading={conversation.opening}
      onClick={() => void open()}
    >
      Написати StarMe
    </Button>
  );
}
