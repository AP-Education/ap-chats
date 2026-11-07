import type { MemberSummary } from '@/components/workspaces/members/types';

/** A message as StarMe reads it: who wrote it and who it mentions, to name them in its text. */
export interface ConversationMessage {
  id: string;
  seq: bigint;
  author: MemberSummary;
  markdown: string;
  mentions: MemberSummary[];
  createdAt: Date;
}

/** The message someone asked StarMe with, and how it reached StarMe. */
export interface Question {
  id: string;
  workspaceId: string;
  channelId: string;
  seq: bigint;
  mentionsStarMe: boolean;
  repliesToStarMe: boolean;
}

/** Why StarMe could not answer, as the asking person is told. */
export type AnswerFailure = 'limited' | 'forbidden' | 'unavailable' | 'failed';

export type StarMeState = 'thinking' | 'answered' | 'failed';
