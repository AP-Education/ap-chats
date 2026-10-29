import { apiRequest, jsonInit } from '@/shared/api/http';

import type { AnswerRequest, QuestionStatus } from '../types';

/** Asks StarMe to answer a posted question; how it goes arrives as StarMe's status. */
export function answerQuestion(
  token: string,
  workspaceId: string,
  channelId: string,
  request: AnswerRequest,
): Promise<void> {
  return apiRequest(
    `/api/workspaces/${workspaceId}/channels/${channelId}/star-me/answers`,
    token,
    jsonInit('POST', request),
  );
}

/** The questions StarMe is answering in the channel, or could not answer. */
export function questionStatuses(
  token: string,
  workspaceId: string,
  channelId: string,
): Promise<{ questions: QuestionStatus[] }> {
  return apiRequest(`/api/workspaces/${workspaceId}/channels/${channelId}/star-me/status`, token);
}
