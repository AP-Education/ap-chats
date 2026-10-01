import { UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets';
import type { Socket } from 'socket.io';

import type { AuthenticatedUser } from '@/components/auth';
import { WorkspaceMembersRepository } from '@/components/workspaces/members/repository';
import { RealtimeRooms } from '@/globals/realtime';

import { TypingDto } from './dto/typing.dto';

type AuthenticatedSocket = Socket & { data: { principal?: AuthenticatedUser } };

@WebSocketGateway({ namespace: '/chats' })
export class TypingGateway {
  constructor(private readonly members: WorkspaceMembersRepository) {}

  // Not routed through deliverChannelEvent: typing never earns a channel_entries
  // position (docs/channel-history-model.md), so re-checking channel audience in
  // Postgres on every keystroke would be wasted work for a signal nobody persists.
  // Trust the room membership `social:watch` already established instead.
  @SubscribeMessage('social:typing')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async typing(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() dto: TypingDto,
  ): Promise<void> {
    const principal = socket.data.principal;
    const room = RealtimeRooms.socialChannel(dto.workspaceId, dto.channelId);
    if (!principal || !socket.rooms.has(room)) throw new WsException('Join this channel first');

    const member = await this.members.findForUser(dto.workspaceId, principal.sub);
    if (!member) throw new WsException('Join this channel first');

    socket.to(room).emit('social:typing', {
      workspaceId: dto.workspaceId,
      channelId: dto.channelId,
      memberId: member.id,
      isTyping: dto.isTyping,
    });
  }
}
