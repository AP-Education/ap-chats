import { ForbiddenException, NotFoundException, UsePipes, ValidationPipe } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Transactional } from '@nestjs-cls/transactional';
import type { Namespace, Socket } from 'socket.io';

import type { AuthenticatedUser } from '@/components/auth';
import { ChannelAccessFacade } from '@/components/communities/channel-access';
import { ChannelAudienceFacade } from '@/components/communities/channel-audience';
import { WorkspaceMembersRepository } from '@/components/workspaces/members/repository';
import { Logger } from '@/globals/logger';
import { RealtimeRooms } from '@/globals/realtime';

import { deliverChannelEvent } from '../realtime/deliver-channel-event';
import { WatchChannelDto } from './dto/watch-channel.dto';
import { MESSAGE_CREATED_EVENT, MessageCreatedEvent } from './events/message-created.event';
import { MESSAGE_DELETED_EVENT, MessageDeletedEvent } from './events/message-deleted.event';
import { MESSAGE_UPDATED_EVENT, MessageUpdatedEvent } from './events/message-updated.event';
import {
  MESSAGES_BATCH_DELETED_EVENT,
  MessagesBatchDeletedEvent,
} from './events/messages-batch-deleted.event';

type AuthenticatedSocket = Socket & { data: { principal?: AuthenticatedUser } };

@WebSocketGateway({ namespace: '/chats' })
export class MessagesGateway {
  @WebSocketServer()
  private namespace!: Namespace;

  constructor(
    private readonly members: WorkspaceMembersRepository,
    private readonly access: ChannelAccessFacade,
    private readonly audience: ChannelAudienceFacade,
    private readonly logger: Logger,
  ) {}

  @SubscribeMessage('social:watch')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async watch(@ConnectedSocket() socket: AuthenticatedSocket, @MessageBody() dto: WatchChannelDto) {
    const principal = socket.data.principal;
    if (!principal) throw new WsException('Unauthorized');
    await this.authorize(principal.sub, dto.workspaceId, dto.channelId);
    await socket.join(RealtimeRooms.socialChannel(dto.workspaceId, dto.channelId));
    return { workspaceId: dto.workspaceId, channelId: dto.channelId };
  }

  @SubscribeMessage('social:unwatch')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async unwatch(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() dto: WatchChannelDto,
  ) {
    await socket.leave(RealtimeRooms.socialChannel(dto.workspaceId, dto.channelId));
    return { workspaceId: dto.workspaceId, channelId: dto.channelId };
  }

  @Transactional()
  private async authorize(userId: string, workspaceId: string, channelId: string): Promise<void> {
    const member = await this.members.findForUser(workspaceId, userId);
    if (!member) throw new WsException('Channel not found');
    try {
      const access = await this.access.requireReadAccess(member, channelId);
      if (!access.isMember) throw new WsException('Join this channel first');
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof NotFoundException)
        throw new WsException('Channel not found');
      throw error;
    }
  }

  @OnEvent(MESSAGE_CREATED_EVENT)
  onCreated(event: MessageCreatedEvent) {
    return this.deliver(MESSAGE_CREATED_EVENT, event);
  }

  @OnEvent(MESSAGE_UPDATED_EVENT)
  onUpdated(event: MessageUpdatedEvent) {
    return this.deliver(MESSAGE_UPDATED_EVENT, event);
  }

  @OnEvent(MESSAGE_DELETED_EVENT)
  onDeleted(event: MessageDeletedEvent) {
    return this.deliver(MESSAGE_DELETED_EVENT, event);
  }

  @OnEvent(MESSAGES_BATCH_DELETED_EVENT)
  onBatchDeleted(event: MessagesBatchDeletedEvent) {
    return this.deliver(MESSAGES_BATCH_DELETED_EVENT, event);
  }

  private deliver(
    type: string,
    event:
      MessageCreatedEvent | MessageUpdatedEvent | MessageDeletedEvent | MessagesBatchDeletedEvent,
  ): Promise<void> {
    return deliverChannelEvent(this.namespace, this.audience, this.logger, type, event);
  }
}
