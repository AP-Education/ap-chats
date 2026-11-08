import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { ChannelAccessSnapshot } from '@/components/communities/channel-access/channel-access/types';
import { STAR_ME } from '@/components/star-me/star-me.identity';
import { WorkspaceMembersRepository } from '@/components/workspaces/members';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { keptGif, linkedGif, type MessageGif } from '../content/message-gif';
import type { NormalizedMessageContent } from '../content/message-markdown';
import { EntriesFacade } from '../entries';
import { MentionsService } from '../mentions';
import { type MessageView, messageView } from './message-view';
import { MessagesRepository } from './repository/messages.repository';
import type {
  DeletedMessage,
  ForwardedCopy,
  MessageModel,
  MessageRef,
  NewMessage,
} from './types/message.types';
import { privateAssistantMessage } from './visibility';

@Injectable()
export class MessagesService {
  constructor(
    private readonly repository: MessagesRepository,
    private readonly entries: EntriesFacade,
    private readonly mentions: MentionsService,
    private readonly members: WorkspaceMembersRepository,
  ) {}

  async requireLive(
    { workspaceId, channelId, messageId }: MessageRef,
    viewerMemberId: string,
  ): Promise<MessageModel> {
    const message = await this.repository.findById(
      workspaceId,
      channelId,
      messageId,
      viewerMemberId,
    );
    const isLive = message !== null && message.deletedAt === null;
    if (!isLive) throw new NotFoundException('Message not found');

    return message;
  }

  /** In the order asked for. */
  async requireLiveMany(
    channelId: string,
    ids: string[],
    viewerMemberId: string,
  ): Promise<MessageModel[]> {
    const found = await this.repository.findMany(channelId, ids, viewerMemberId);
    const byId = new Map(found.map((message) => [message.id, message]));

    return ids.map((id) => {
      const message = byId.get(id);
      const isLive = message !== undefined && message.deletedAt === null;
      if (!isLive) throw new NotFoundException('Message not found');
      return message;
    });
  }

  /** An earlier attempt of this same request; another request reusing the nonce conflicts. */
  async findRepeat(
    author: WorkspaceMember,
    channelId: string,
    request: { clientNonce: string; requestDigest: string },
  ): Promise<MessageView | null> {
    const existing = await this.repository.findByNonce(channelId, author.id, request.clientNonce);
    if (!existing) return null;

    const isSameRequest = existing.requestDigest === request.requestDigest;
    if (!isSameRequest) throw new ConflictException('Client nonce was used for another message');

    return messageView(existing, await this.repository.entrySeq(existing.id), author.id);
  }

  /** A batch counts as repeated only when every message of it is there. */
  async findRepeatedBatch(
    author: WorkspaceMember,
    channelId: string,
    request: { clientNonces: string[]; requestDigest: string },
  ): Promise<MessageView[] | null> {
    const { clientNonces, requestDigest } = request;
    const existing = await this.repository.findByNonces(channelId, author.id, clientNonces);
    if (!existing.length) return null;

    const isSameRequest =
      existing.length === clientNonces.length &&
      existing.every(({ message }) => message.requestDigest === requestDigest);
    if (!isSameRequest) throw new ConflictException('Batch nonce was used for another forward');

    const byNonce = new Map(
      existing.map(({ message, seq }) => [message.clientNonce, { message, seq }]),
    );
    return clientNonces.map((nonce) => {
      const { message, seq } = byNonce.get(nonce)!;
      return messageView(message, seq, author.id);
    });
  }

  async post(
    author: WorkspaceMember,
    channel: ChannelAccessSnapshot,
    message: NewMessage,
    authority: WorkspaceMember = author,
  ): Promise<MessageView> {
    await this.mentions.requireValid(channel, message.content.mentions);
    const audience = await this.assistantAudience(author, authority, channel, message);

    const created = await this.repository.insert({
      workspaceId: channel.workspaceId,
      channelId: channel.id,
      authorMemberId: author.id,
      contentMarkdown: message.content.markdown,
      attachments: message.attachments,
      gif: message.gif,
      replyToMessageId: message.replyToMessageId,
      quoteText: message.quoteText,
      requestDigest: message.requestDigest,
      clientNonce: message.clientNonce,
      ...audience,
    });
    const entry = await this.entries.append(
      channel.workspaceId,
      channel.id,
      created.id,
      privateAssistantMessage(created),
    );
    await this.mentions.replace(
      this.mentionedBy(created),
      privateAssistantMessage(created)
        ? { ...message.content.mentions, roleIds: [], everyone: false }
        : message.content.mentions,
    );
    if (message.contextMessageIds.length) {
      await this.repository.addContext(created, entry.seq, message.contextMessageIds);
    }

    return messageView(created, entry.seq, authority.id);
  }

  async postForwarded(
    author: WorkspaceMember,
    channelId: string,
    request: { copies: ForwardedCopy[]; requestDigest: string },
  ): Promise<MessageView[]> {
    const posted = await this.repository.insertForwarded({
      workspaceId: author.workspaceId,
      channelId,
      authorMemberId: author.id,
      ...request,
    });
    const positions = await this.entries.appendMany(
      author.workspaceId,
      channelId,
      posted.map(({ id }) => id),
    );

    return posted.map((message, index) => messageView(message, positions[index]!.seq, author.id));
  }

  async revise(
    author: WorkspaceMember,
    channel: ChannelAccessSnapshot,
    messageId: string,
    change: {
      content: NormalizedMessageContent;
      gif: MessageGif | undefined;
      expectedRevision: number | undefined;
    },
  ): Promise<MessageView> {
    const message = await this.repository.findById(
      channel.workspaceId,
      channel.id,
      messageId,
      author.id,
    );
    if (!message) throw new NotFoundException('Message not found');

    const { content, expectedRevision } = change;
    const isAuthor = message.authorMemberId === author.id;
    if (!isAuthor) throw new ForbiddenException('Only the author can edit this message');
    if (message.deletedAt) throw new ConflictException('Message was deleted');

    const isBlank = !content.plainText.trim() && !message.attachments.length;
    if (isBlank) throw new BadRequestException('Message cannot be blank');

    const isStale = expectedRevision !== undefined && expectedRevision !== message.revision;
    if (isStale) throw new ConflictException('Message was changed');

    await this.mentions.requireValid(channel, content.mentions);
    if (!privateAssistantMessage(message) && content.mentions.memberIds.length) {
      const assistant = await this.members.findForUser(channel.workspaceId, STAR_ME.subject);
      if (assistant && content.mentions.memberIds.includes(assistant.id)) {
        throw new BadRequestException('Start a private StarMe message from the composer');
      }
    }
    const gif = change.gif
      ? linkedGif(change.gif, content.links)
      : keptGif(message.gif, content.links);
    const revised = await this.repository.updateContent(messageId, {
      markdown: content.markdown,
      gif,
      revision: message.revision + 1,
    });
    await this.mentions.replace(
      this.mentionedBy(revised),
      privateAssistantMessage(revised)
        ? { ...content.mentions, roleIds: [], everyone: false }
        : content.mentions,
    );

    return messageView(revised, await this.repository.entrySeq(messageId), author.id);
  }

  async remove(
    actor: WorkspaceMember,
    channelId: string,
    request: { ids: string[]; moderates: boolean },
  ): Promise<DeletedMessage[]> {
    const rows = await this.repository.findWithEntries(channelId, request.ids, actor.id);
    if (rows.length !== request.ids.length) throw new NotFoundException('Message not found');

    const touchesOthers = rows.some(
      ({ message }) =>
        message.authorMemberId !== actor.id &&
        !(privateAssistantMessage(message) && message.assistantOwnerMemberId === actor.id),
    );
    if (touchesOthers && !request.moderates)
      throw new ForbiddenException('Cannot delete another member’s message');

    const remaining = rows.filter(({ message }) => !message.deletedAt);
    const remainingIds = remaining.map(({ message }) => message.id);
    await this.repository.tombstone(remainingIds);
    await this.mentions.removeForMessages(remainingIds);

    return remaining.map(({ message, seq }) => ({
      id: message.id,
      seq: seq.toString(),
      authorMemberId: message.authorMemberId,
      ...(privateAssistantMessage(message) ? { privateToUserId: actor.profile.oidcUserId } : {}),
    }));
  }

  private async assistantAudience(
    author: WorkspaceMember,
    authority: WorkspaceMember,
    channel: ChannelAccessSnapshot,
    message: NewMessage,
  ) {
    const reply = message.replyToMessageId
      ? await this.repository.findById(
          channel.workspaceId,
          channel.id,
          message.replyToMessageId,
          authority.id,
        )
      : null;
    const botAuthor = author.profile.oidcUserId === STAR_ME.subject;
    const privateReply = Boolean(reply && privateAssistantMessage(reply));
    const mayAddressAssistant =
      botAuthor ||
      message.assistant ||
      privateReply ||
      message.content.mentions.memberIds.length > 0 ||
      Boolean(reply);
    if (!mayAddressAssistant) return {};
    const assistant = await this.members.findForUser(channel.workspaceId, STAR_ME.subject);
    const mentionsAssistant =
      assistant && message.content.mentions.memberIds.includes(assistant.id);
    const repliesToAssistant = assistant && reply?.authorMemberId === assistant.id;
    if (
      !botAuthor &&
      !message.assistant &&
      !privateReply &&
      !mentionsAssistant &&
      !repliesToAssistant
    )
      return {};
    if (!assistant) throw new NotFoundException('StarMe is not in this workspace');
    if (author.id !== authority.id && !botAuthor)
      throw new ForbiddenException('Only StarMe can post a private assistant answer');
    if (botAuthor && (!reply || reply.authorMemberId !== authority.id))
      throw new BadRequestException('An assistant answer requires the owner’s question');
    return {
      assistantOwnerMemberId: authority.id,
      assistantQuestionId: botAuthor ? reply!.id : null,
    };
  }

  async makeOwn(actor: WorkspaceMember, channel: ChannelAccessSnapshot, messageId: string) {
    const message = await this.requireLive(
      { workspaceId: channel.workspaceId, channelId: channel.id, messageId },
      actor.id,
    );
    if (message.assistantOwnerMemberId !== actor.id || !message.assistantQuestionId)
      throw new NotFoundException('Private assistant answer not found');
    if (message.publishedAt)
      return {
        message: messageView(message, await this.repository.entrySeq(messageId), actor.id),
        changed: false,
      };
    const originalSeq = await this.repository.entrySeq(messageId);
    const updated = await this.repository.makeOwn(messageId, actor.id, originalSeq);
    const seq = await this.entries.moveToEnd(channel.workspaceId, channel.id, messageId);
    return { message: messageView(updated, seq, actor.id), changed: true };
  }

  requireShared(message: MessageModel): void {
    if (privateAssistantMessage(message))
      throw new BadRequestException('Publish the private assistant message before sharing it');
  }

  private mentionedBy(message: MessageModel) {
    return {
      workspaceId: message.workspaceId,
      channelId: message.channelId,
      messageId: message.id,
      authorMemberId: message.authorMemberId,
    };
  }
}
