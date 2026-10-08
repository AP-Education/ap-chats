import { Global, Module } from '@nestjs/common';

import { BullMqJobQueue } from './bullmq-job-queue';
import { JobQueue } from './job-queue';

@Global()
@Module({ providers: [{ provide: JobQueue, useClass: BullMqJobQueue }], exports: [JobQueue] })
export class JobsModule {}
