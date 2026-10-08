import { UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets';

import type { RealtimeSocket } from '@/components/bootstrap/realtime-socket.types';
import { Logger } from '@/globals/logger';

import { UpdateAttentionDto } from './dto/update-attention.dto';
import { AttentionRepository } from './repository/attention.repository';

@WebSocketGateway({ namespace: '/chats' })
export class AttentionGateway implements OnGatewayDisconnect {
  constructor(
    private readonly attention: AttentionRepository,
    private readonly logger: Logger,
  ) {}

  @SubscribeMessage('attention:update')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async update(@ConnectedSocket() socket: RealtimeSocket, @MessageBody() dto: UpdateAttentionDto) {
    const principal = socket.data.principal;
    if (!principal) throw new WsException('Unauthorized');

    await this.attention.update(principal.sub, socket.id, dto.attending);
  }

  async handleDisconnect(socket: RealtimeSocket): Promise<void> {
    const principal = socket.data.principal;
    if (!principal) return;

    await this.attention.update(principal.sub, socket.id, false).catch((err: unknown) => {
      this.logger.child({ socketId: socket.id }).warn({ err }, 'Attention release failed');
    });
  }
}
