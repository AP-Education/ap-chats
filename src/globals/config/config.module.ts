import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateConfig } from './config.schema';
import { AppConfigService } from './config.service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: ['.env.local', '.env'], validate: validateConfig }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
