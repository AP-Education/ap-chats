import { createHash } from 'node:crypto';

import { BadRequestException, Injectable } from '@nestjs/common';

import type { ChannelAccessSnapshot } from '@/components/communities/channel-access/channel-access/types';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { UploadsService } from '../attachments';
import { MessageMarkdownService, messagePlainText } from '../content';
import { MessagesService } from '../messages';
import type { NewMessage } from '../messages/types/message.types';
import type { SendMessageDto } from './dto/send-message.dto';
import type { MessageDraft } from './types';

@Injectable()
export class MessageComposer {
  constructor(
    private readonly markdown: MessageMarkdownService,
    private readonly messages: MessagesService,
    private readonly uploads: UploadsService,
  ) {}

  async draft(request: SendMessageDto): Promise<MessageDraft> {
    const hasAttachments = Boolean(request.attachments?.length);
    const content = await this.markdown.normalize(request.markdown, hasAttachments);
    const replyToMessageId = request.replyToMessageId ?? null;
    const quoteText = request.quoteText?.trim() || null;
    const requestDigest = digest({
      markdown: content.markdown,
      reply: replyToMessageId,
      quote: quoteText,
      attachments: hasAttachments ? request.attachments : undefined,
    });

    return {
      content,
      attachmentRefs: request.attachments ?? [],
      replyToMessageId,
      quoteText,
      clientNonce: request.clientNonce,
      requestDigest,
    };
  }

  async complete(
    author: WorkspaceMember,
    channel: ChannelAccessSnapshot,
    draft: MessageDraft,
  ): Promise<NewMessage> {
    const { replyToMessageId, quoteText } = draft;
    if (replyToMessageId) await this.requireReplyTarget(channel, replyToMessageId, quoteText);
    const attachments = await this.uploads.claim(author, channel.id, draft.attachmentRefs);

    return {
      content: draft.content,
      attachments,
      replyToMessageId,
      quoteText,
      clientNonce: draft.clientNonce,
      requestDigest: draft.requestDigest,
    };
  }

  private async requireReplyTarget(
    channel: ChannelAccessSnapshot,
    messageId: string,
    quoteText: string | null,
  ) {
    const target = await this.messages.requireLive({
      workspaceId: channel.workspaceId,
      channelId: channel.id,
      messageId,
    });
    if (!quoteText) return;

    const isQuoted = containsQuote(await messagePlainText(target.contentMarkdown), quoteText);
    if (!isQuoted) throw new BadRequestException('Quote is not in the reply target');
  }
}

function digest(request: object): string {
  return createHash('sha256').update(JSON.stringify(request)).digest('hex');
}

function containsQuote(source: string, selection: string): boolean {
  const compact = (value: string) => value.normalize('NFC').replace(/\s+/gu, ' ').trim();
  return compact(source).includes(compact(selection));
}
