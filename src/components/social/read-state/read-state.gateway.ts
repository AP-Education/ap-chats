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

import { WatchWorkspaceDto } from './dto/watch-workspace.dto';

type AuthenticatedSocket = Socket & { data: { principal?: AuthenticatedUser } };

@WebSocketGateway({ namespace: '/chats' })
export class ReadStateGateway {
  constructor(private readonly members: WorkspaceMembersRepository) {}

  @SubscribeMessage('social:watch-workspace')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async watch(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() dto: WatchWorkspaceDto,
  ) {
    const principal = socket.data.principal;
    if (!principal || !(await this.members.findForUser(dto.workspaceId, principal.sub)))
      throw new WsException('Workspace not found');
    await socket.join(RealtimeRooms.socialWorkspace(dto.workspaceId));
    return { workspaceId: dto.workspaceId };
  }

  @SubscribeMessage('social:unwatch-workspace')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async unwatch(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() dto: WatchWorkspaceDto,
  ) {
    await socket.leave(RealtimeRooms.socialWorkspace(dto.workspaceId));
    return { workspaceId: dto.workspaceId };
  }
}
