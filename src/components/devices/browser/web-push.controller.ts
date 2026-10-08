import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { type AuthenticatedUser, AuthGuard, CurrentUser } from '@/components/auth';

import { RegisterWebPushDto } from './dto';
import { WebPushService } from './web-push.service';

@Controller('devices/web')
@UseGuards(AuthGuard)
export class WebPushController {
  constructor(private readonly push: WebPushService) {}

  @Get('config')
  configuration() {
    return this.push.configuration();
  }

  @Post()
  register(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterWebPushDto) {
    return this.push.register(user.sub, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.push.remove(user.sub, id);
  }
}
