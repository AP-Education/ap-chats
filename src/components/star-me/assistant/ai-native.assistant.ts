import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AppConfigService } from '@/globals/config';
import { Logger } from '@/globals/logger';

import type { AnswerFailure } from '../types';
import { Assistant, AssistantFailure, type AssistantTurn } from './assistant';

// Tool calls, such as creating a task, can take a model several rounds.
const RUN_TIMEOUT_MS = 120_000;

const runResponse = z.object({ text: z.string() });

/** ai-native's company assistant, run through its Agent API as the asking person. */
@Injectable()
export class AiNativeAssistant extends Assistant {
  private readonly baseUrl: string | undefined;

  constructor(
    config: AppConfigService,
    private readonly logger: Logger,
  ) {
    super();
    this.baseUrl = config.get('AI_NATIVE_URL');
  }

  async reply(turns: AssistantTurn[], accessToken: string): Promise<string> {
    if (!this.baseUrl) throw new AssistantFailure('unavailable');

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/agents/default/run`, {
        method: 'POST',
        headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ messages: turns, stream: false }),
        signal: AbortSignal.timeout(RUN_TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.warn({ err: error }, '[star-me] ai-native unreachable');
      throw new AssistantFailure('unavailable');
    }

    if (!response.ok) {
      this.logger.warn(
        { status: response.status, body: await response.text() },
        '[star-me] ai-native refused the run',
      );
      throw new AssistantFailure(failureOf(response.status));
    }

    const run = runResponse.safeParse(await response.json());
    if (!run.success || !run.data.text.trim()) throw new AssistantFailure('failed');
    return run.data.text;
  }
}

function failureOf(status: number): AnswerFailure {
  if (status === 429) return 'limited';
  if (status === 401 || status === 403) return 'forbidden';
  if (status === 502 || status === 503 || status === 504) return 'unavailable';
  return 'failed';
}
