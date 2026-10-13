import { Module } from '@nestjs/common';

import { MessageMarkdownService } from './message-markdown';

@Module({
  providers: [MessageMarkdownService],
  exports: [MessageMarkdownService],
})
export class ContentModule {}
