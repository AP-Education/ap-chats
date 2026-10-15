import { useMutation } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { answerQuestion } from '../api/star-me-api';
import type { AskRequest } from '../types';

/**
 * Asks StarMe to answer a posted question; how it goes arrives as StarMe's status. A request lost
 * on the way is sent again, which is safe: StarMe answers each question once.
 */
export function useAskStarMe(workspaceId: string): (request: AskRequest) => void {
  const { token } = useQueryAuth();
  const { mutate } = useMutation({
    mutationFn: ({ channelId, ...request }: AskRequest) => {
      if (!token) throw new Error('Not signed in');
      return answerQuestion(token, workspaceId, channelId, request);
    },
    retry: 3,
  });

  return mutate;
}
