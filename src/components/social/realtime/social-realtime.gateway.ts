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

/** A channel now followed, and where its history ended once following began. */
interface WatchedChannel {
  workspaceId: string;
  channelId: string;
  lastEntrySeq: string;
}

@WebSocketGateway({ namespace: '/chats' })
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class SocialRealtimeGateway {
  constructor(private readonly watching: ChannelWatchService) {}

  @SubscribeMessage('social:watch')
  async watch(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() { workspaceId, channelId }: WatchChannelDto,
  ): Promise<WatchedChannel> {
    const userId = socket.data.principal?.sub;
    if (!userId) throw new WsException('Unauthorized');

    const mayWatch = (await this.watching.watchable(userId, workspaceId, channelId)) !== null;
    if (!mayWatch) throw new WsException('Channel not found');

    const room = channelRoom(workspaceId, channelId);
    await socket.join(room);

    // Read once joined: an entry created after this reaches the room, an earlier one is counted here.
    const channel = await this.watching.watchable(userId, workspaceId, channelId);
    if (!channel) {
      await socket.leave(room);
      throw new WsException('Channel not found');
    }

    return { workspaceId, channelId, lastEntrySeq: channel.lastEntrySeq.toString() };
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
