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

import { UseAuthGuards } from '@/components/auth';
import { CurrentWorkspaceMember } from '@/components/workspaces/members/decorators';
import { WorkspaceMemberGuard } from '@/components/workspaces/members/guards';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { AttachmentDownloadsService } from './attachment-downloads.service';
import { BeginUploadDto, DownloadQueryDto, SignPartDto } from './dto/upload.dto';
import { UploadCompletionService } from './upload-completion.service';
import { UploadsService } from './uploads.service';

@Controller('workspaces/:workspaceId/channels/:channelId/uploads')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class ChatUploadsController {
  constructor(
    private readonly uploads: UploadsService,
    private readonly completion: UploadCompletionService,
    private readonly downloads: AttachmentDownloadsService,
  ) {}

  @Get('policy')
  policy() {
    return this.uploads.limits;
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
    return this.completion.complete(member, channelId, id);
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
    @Query() query: DownloadQueryDto,
  ) {
    const message = { workspaceId: member.workspaceId, channelId, messageId };
    return this.downloads.link(member, message, id, query.variant);
  }
}
