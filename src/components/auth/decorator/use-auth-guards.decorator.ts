import { type CanActivate, type Type, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../guards/auth.guard';

export const UseAuthGuards = (...guards: Array<Type<CanActivate> | CanActivate>) =>
  UseGuards(AuthGuard, ...guards);
