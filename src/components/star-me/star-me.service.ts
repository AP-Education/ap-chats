import { createHash } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ChannelAccessFacade } from '@/components/communities/channel-access';
import { ChannelMembershipsService } from '@/components/communities/memberships';
import { MessagesFacade } from '@/components/social/messages';
import { WorkspaceMembersRepository } from '@/components/workspaces/members/repository';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import { EventPublisher } from '@/globals/publisher/event-publisher';

import { Assistant, AssistantFailure, type AssistantTurn } from './assistant';
import { readableText } from './content';
import type { AnswerQuestionDto } from './dto/answer-question.dto';
import { STAR_ME_STATUS_EVENT, StarMeStatusEvent } from './events/star-me-status.event';
import { StarMeRepository } from './repository';
import { STAR_ME } from './star-me.identity';
import type {
  AnswerFailure,
  ConversationMessage,
  PickedMessage,
  Question,
  StarMeState,
} from './types';

/** How much of a conversation StarMe reads when nobody picked the messages for it. */
const RECENT_MESSAGES = 20;
// A model can ramble far past a chat message, which holds 32 KB.
const MAX_ANSWER_CHARACTERS = 12_000;

const FAILURE_STATUS: Record<AnswerFailure, HttpStatus> = {
  limited: HttpStatus.TOO_MANY_REQUESTS,
  forbidden: HttpStatus.FORBIDDEN,
  unavailable: HttpStatus.SERVICE_UNAVAILABLE,
  failed: HttpStatus.BAD_GATEWAY,
};

@Injectable()
export class StarMeService {
  constructor(
    private readonly members: WorkspaceMembersRepository,
    private readonly access: ChannelAccessFacade,
    private readonly memberships: ChannelMembershipsService,
    private readonly messages: MessagesFacade,
    private readonly repository: StarMeRepository,
    private readonly assistant: Assistant,
    private readonly events: EventPublisher,
  ) {}

  /**
   * Answers the person's posted question as a reply in the same channel. The assistant runs
   * with the asker's own token, which is why the asker requests the answer. Asking again
   * returns the answer already given instead of another one.
   */
  async answer(
    asker: WorkspaceMember,
    channelId: string,
    dto: AnswerQuestionDto,
    accessToken: string,
  ): Promise<{ answerId: string }> {
    const starMe = await this.requireStarMe(asker.workspaceId);
    const question = await this.requireQuestion(asker, channelId, dto.questionId, starMe);
    if (dto.contextMessageIds?.length) {
      await this.repository.pick(question, dto.contextMessageIds);
    }

    const clientNonce = answerNonce(question.id);
    const answered = await this.repository.answerId(channelId, starMe.id, clientNonce);
    if (answered) return { answerId: answered };

    const conversation = await this.conversation(question);
    const turns = await this.turns(conversation, starMe);

    this.announce(question, asker, 'thinking');
    try {
      const reply = await this.assistant.reply(turns, accessToken);
      const answerId = await this.reply(asker, starMe, question, reply, clientNonce);

      this.announce(question, asker, 'answered');
      return { answerId };
    } catch (error) {
      const failure = error instanceof AssistantFailure ? error.reason : 'failed';
      this.announce(question, asker, 'failed', failure);
      if (error instanceof AssistantFailure) {
        throw new HttpException({ error: failure }, FAILURE_STATUS[failure]);
      }
      throw error;
    }
  }

  /** The messages a question was asked about, for anyone who can read its channel. */
  async picked(
    reader: WorkspaceMember,
    channelId: string,
    questionId: string,
  ): Promise<{ messages: PickedMessage[] }> {
    await this.access.requireViewAccess(reader, channelId);
    const picked = await this.repository.picked(channelId, questionId);
    return { messages: picked.map(({ id, author, markdown }) => ({ id, author, markdown })) };
  }

  private async requireStarMe(workspaceId: string): Promise<WorkspaceMember> {
    const starMe = await this.members.findForUser(workspaceId, STAR_ME.subject);
    if (!starMe) throw new NotFoundException('StarMe is not in this workspace');
    return starMe;
  }

  private async requireQuestion(
    asker: WorkspaceMember,
    channelId: string,
    messageId: string,
    starMe: WorkspaceMember,
  ): Promise<Question> {
    const question = await this.repository.question(asker.id, channelId, messageId, starMe.id);
    if (!question) throw new NotFoundException('Message not found');
    if (!question.mentionsStarMe && !question.repliesToStarMe) {
      throw new BadRequestException('The message does not ask StarMe');
    }
    return question;
  }

  // Picked messages when the person chose them, otherwise the latest ones; the question comes last.
  private async conversation(question: Question): Promise<ConversationMessage[]> {
    const picked = await this.repository.picked(question.channelId, question.id);
    if (!picked.length) {
      return this.repository.recent(question.channelId, question.seq, RECENT_MESSAGES);
    }

    const asked = await this.repository.selected(question.channelId, [question.id]);
    return [...picked, ...asked];
  }

  private async turns(
    conversation: ConversationMessage[],
    starMe: WorkspaceMember,
  ): Promise<AssistantTurn[]> {
    const turns = await Promise.all(
      conversation.map(async (message): Promise<AssistantTurn> => {
        const text = await readableText(message.markdown, message.mentions);
        if (message.author.memberId === starMe.id) return { role: 'assistant', text };

        return {
          role: 'user',
          author: message.author.displayName ?? 'Учасник',
          text,
          at: message.createdAt.toISOString(),
        };
      }),
    );
    return turns.filter((turn) => turn.text);
  }

  private async reply(
    asker: WorkspaceMember,
    starMe: WorkspaceMember,
    question: Question,
    answer: string,
    clientNonce: string,
  ): Promise<string> {
    // Summoned into a channel, StarMe joins it on behalf of whoever asked.
    await this.memberships.add(asker, question.channelId, starMe.id);

    try {
      const sent = await this.messages.send(starMe, question.channelId, {
        markdown: Array.from(answer.trim()).slice(0, MAX_ANSWER_CHARACTERS).join(''),
        clientNonce,
        replyToMessageId: question.id,
      });
      return sent.id;
    } catch (error) {
      // A second request for the same question may finish first; its answer stands.
      const answered =
        error instanceof ConflictException &&
        (await this.repository.answerId(question.channelId, starMe.id, clientNonce));
      if (answered) return answered;
      throw error;
    }
  }

  private announce(
    question: Question,
    asker: WorkspaceMember,
    state: StarMeState,
    failure: AnswerFailure | null = null,
  ): void {
    this.events.publish(
      STAR_ME_STATUS_EVENT,
      new StarMeStatusEvent(
        question.workspaceId,
        question.channelId,
        question.id,
        asker.id,
        state,
        failure,
      ),
    );
  }
}

/** One answer per question: its nonce is derived from the question, so a retry finds it. */
export function answerNonce(questionId: string): string {
  const hex = createHash('sha256').update(`star-me:${questionId}`).digest('hex');
  const variant = ((parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
