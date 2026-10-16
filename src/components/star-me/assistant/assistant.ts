import type { AnswerFailure } from '../types';

/** One message of the conversation the assistant answers; the last one is the question. */
export interface AssistantTurn {
  role: 'user' | 'assistant';
  author?: string;
  text: string;
  at?: string;
}

export class AssistantFailure extends Error {
  constructor(readonly reason: AnswerFailure) {
    super(`Assistant failed: ${reason}`);
  }
}

/** The model behind StarMe. It acts with the asking person's own access, never more. */
export abstract class Assistant {
  /** Throws AssistantFailure when it cannot answer. */
  abstract reply(turns: AssistantTurn[], accessToken: string): Promise<string>;
}
