import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

import { UseAuthGuards } from '@/components/auth';
import { CurrentWorkspaceMember } from '@/components/workspaces/members/decorators';
import { WorkspaceMemberGuard } from '@/components/workspaces/members/guards';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { ChatUploadsService } from './chat-uploads.service';

class BeginUploadDto {
  @IsString() @MaxLength(255) name!: string;
  @IsInt() @Min(1) @Max(1_000_000_000) size!: number;
}

class SignPartDto {
  @IsInt() @Min(1) @Max(60) number!: number;
}

@Controller('workspaces/:workspaceId/channels/:channelId/uploads')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class ChatUploadsController {
  constructor(private readonly uploads: ChatUploadsService) {}

  @Get('policy')
  policy() {
    return this.uploads.policy.limits;
  }

  @Post()
  begin(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Body() dto: BeginUploadDto,
  ) {
    return this.uploads.begin(member, channelId, dto.name, dto.size);
  }

  @Post(':id/part')
  part(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SignPartDto,
  ) {
    return this.uploads.signPart(member, channelId, id, dto.number);
  }

  @Post(':id/complete')
  complete(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.uploads.complete(member, channelId, id);
  }

  @Delete(':id')
  @HttpCode(204)
  cancel(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.uploads.cancel(member, channelId, id);
  }

  @Get(':id/messages/:messageId/url')
  download(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Query('variant') variant = 'download',
  ) {
    return this.uploads.download(member, channelId, messageId, id, variant);
  }
}
