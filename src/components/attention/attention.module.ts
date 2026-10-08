import { Module } from '@nestjs/common';

import { AttentionGateway } from './attention.gateway';
import { AttentionRepository } from './repository/attention.repository';
import { ValkeyAttentionRepository } from './repository/valkey-attention.repository';

@Module({
  providers: [
    { provide: AttentionRepository, useClass: ValkeyAttentionRepository },
    AttentionGateway,
  ],
  exports: [AttentionRepository],
})
export class AttentionModule {}
