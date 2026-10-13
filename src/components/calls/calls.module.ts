import { Module } from '@nestjs/common';

import { LiveCallsModule } from './calls';
import { CallsHistoryModule } from './history';

@Module({
  imports: [LiveCallsModule, CallsHistoryModule],
})
export class CallsModule {}
