import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { paths } from '@/shared/lib/paths';

import { openDirectMessage } from '../api/direct-messages-api';

export function useOpenDirectMessage(workspaceId: string) {
  const { token } = useQueryAuth();
  const navigate = useNavigate();
  const [opening, setOpening] = useState(false);

  async function open(memberId: string) {
    if (!token) throw new Error('Authentication is unavailable');
    setOpening(true);
    try {
      const conversation = await openDirectMessage(token, workspaceId, memberId);
      navigate(paths.directMessage(conversation.id));
    } finally {
      setOpening(false);
    }
  }

  return { open, opening };
}
