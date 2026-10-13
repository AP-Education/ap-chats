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

import { channelRoom } from './channel-room';
import { ChannelWatchService } from './channel-watch.service';
import { WatchChannelDto } from './dto/watch-channel.dto';

type AuthenticatedSocket = Socket & { data: { principal?: AuthenticatedUser } };

@WebSocketGateway({ namespace: '/chats' })
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class SocialRealtimeGateway {
  constructor(private readonly watching: ChannelWatchService) {}

  @SubscribeMessage('social:watch')
  async watch(@ConnectedSocket() socket: AuthenticatedSocket, @MessageBody() dto: WatchChannelDto) {
    const userId = socket.data.principal?.sub;
    if (!userId) throw new WsException('Unauthorized');

    const mayWatch = await this.watching.mayWatch(userId, dto.workspaceId, dto.channelId);
    if (!mayWatch) throw new WsException('Channel not found');

    await socket.join(channelRoom(dto.workspaceId, dto.channelId));
    return dto;
  }

  @SubscribeMessage('social:unwatch')
  async unwatch(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() dto: WatchChannelDto,
  ) {
    await socket.leave(channelRoom(dto.workspaceId, dto.channelId));
    return dto;
  }
}
