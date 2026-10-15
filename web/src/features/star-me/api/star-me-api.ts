import { apiRequest, jsonInit } from '@/shared/api/http';

import type { AnswerRequest, PickedMessage, QuestionStatus } from '../types';

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
