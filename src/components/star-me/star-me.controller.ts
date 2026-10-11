import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';

import { AccessToken, UseAuthGuards } from '@/components/auth';
import { CurrentWorkspaceMember } from '@/components/workspaces/members/decorators';
import { WorkspaceMemberGuard } from '@/components/workspaces/members/guards';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { AnswerQuestionDto } from './dto/answer-question.dto';
import { StarMeService } from './star-me.service';

@Controller('workspaces/:workspaceId/channels/:channelId/star-me')
@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))
export class StarMeController {
  constructor(private readonly starMe: StarMeService) {}

  @Post('answers')
  answer(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Body() dto: AnswerQuestionDto,
    @AccessToken() accessToken: string,
  ) {
    return this.starMe.answer(member, channelId, dto, accessToken);
  }

  @Get('questions/:questionId/picked')
  picked(
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ) {
    return this.starMe.picked(member, channelId, questionId);
  }
}
