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
import { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import { WorkspaceMembersRepository } from '@/components/workspaces/members/repository';

import { ChannelBroadcast } from '../realtime/channel-broadcast';
import { channelRoom } from '../realtime/channel-room';
import { TypingDto } from './dto/typing.dto';

type AuthenticatedSocket = Socket & { data: { principal?: AuthenticatedUser } };

@WebSocketGateway({ namespace: '/chats' })
export class TypingGateway {
  constructor(
    private readonly members: WorkspaceMembersRepository,
    private readonly access: ChannelAccessPolicy,
    private readonly channels: ChannelBroadcast,
  ) {}

  @SubscribeMessage('social:typing')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async typing(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() dto: TypingDto,
  ): Promise<void> {
    const principal = socket.data.principal;
    const room = channelRoom(dto.workspaceId, dto.channelId);
    if (!principal || !socket.rooms.has(room)) throw new WsException('Join this channel first');

    const member = await this.members.findForUser(dto.workspaceId, principal.sub);
    if (!member) throw new WsException('Join this channel first');
    await this.access.requireViewAccess(member, dto.channelId);

    await this.channels.send(dto, 'social:typing', {
      workspaceId: dto.workspaceId,
      channelId: dto.channelId,
      memberId: member.id,
      isTyping: dto.isTyping,
    });
  }
}
