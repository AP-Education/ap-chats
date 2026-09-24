import { Module } from '@nestjs/common';

import { AccountsTokenVerifier } from './accounts-token-verifier.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './guards/auth.guard';

@Module({
  controllers: [AuthController],
  providers: [AccountsTokenVerifier, AuthGuard],
  exports: [AccountsTokenVerifier, AuthGuard],
})
export class AuthModule {}
