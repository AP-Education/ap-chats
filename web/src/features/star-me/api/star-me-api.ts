import { apiRequest, jsonInit } from '@/shared/api/http';

import type { AnswerRequest, PickedMessage } from '../types';

/** Asks StarMe to answer a posted question; resolves once it has, which can take a while. */
export function answerQuestion(
  token: string,
  workspaceId: string,
  channelId: string,
  request: AnswerRequest,
): Promise<{ answerId: string }> {
  return apiRequest(
    `/api/workspaces/${workspaceId}/channels/${channelId}/star-me/answers`,
    token,
    jsonInit('POST', request),
  );
}

/** The messages a question was asked about; none when it was asked about the latest ones. */
export function pickedMessages(
  token: string,
  workspaceId: string,
  channelId: string,
  questionId: string,
): Promise<{ messages: PickedMessage[] }> {
  return apiRequest(
    `/api/workspaces/${workspaceId}/channels/${channelId}/star-me/questions/${questionId}/picked`,
    token,
  );
}
