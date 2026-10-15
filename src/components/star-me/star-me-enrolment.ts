import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { WORKSPACE_CREATED_EVENT, WorkspaceCreatedEvent } from '@/components/workspaces';
import { Logger } from '@/globals/logger';

import { StarMeRepository } from './repository';
import { STAR_ME } from './star-me.identity';

/** StarMe belongs to every workspace from the start, the ones that exist and the new ones. */
@Injectable()
export class StarMeEnrolment implements OnApplicationBootstrap {
  constructor(
    private readonly repository: StarMeRepository,
    private readonly logger: Logger,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.repository.saveIdentity(STAR_ME);
      await this.repository.enrol(STAR_ME);
    } catch (error) {
      this.logger.error({ err: error }, '[star-me] enrolment failed');
    }
  }

  @OnEvent(WORKSPACE_CREATED_EVENT)
  async onWorkspaceCreated({ workspaceId }: WorkspaceCreatedEvent): Promise<void> {
    try {
      await this.repository.enrol(STAR_ME, workspaceId);
    } catch (error) {
      this.logger.error({ err: error, workspaceId }, '[star-me] enrolment failed');
    }
  }
}
