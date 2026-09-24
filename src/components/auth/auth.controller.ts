import { Controller, Get, Header, UseGuards } from '@nestjs/common';

import type { AuthenticatedUser } from './access-token';
import { CurrentUser } from './decorator/current-user.decorator';
import { AuthGuard } from './guards/auth.guard';

@Controller('auth')
export class AuthController {
  @Get('me')
  @UseGuards(AuthGuard)
  @Header('Cache-Control', 'no-store')
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }
}
