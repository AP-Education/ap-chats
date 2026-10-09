import { OnEvent } from '@nestjs/event-emitter';
import { WebSocketGateway } from '@nestjs/websockets';

import { Logger } from '@/globals/logger';
import { RealtimePublisher } from '@/globals/realtime';

import { WORKSPACE_DELETED_EVENT, WorkspaceDeletedEvent } from './events/workspace-deleted.event';

@WebSocketGateway({ namespace: '/chats' })
export class WorkspacesGateway {
  constructor(
    private readonly realtime: RealtimePublisher,
    private readonly logger: Logger,
  ) {}

  @OnEvent(WORKSPACE_DELETED_EVENT)
  onDeleted(event: WorkspaceDeletedEvent): void {
    try {
      for (const userId of new Set(event.memberUserIds)) {
        this.realtime.toUser(userId, 'workspaces:changed', {
          type: WORKSPACE_DELETED_EVENT,
          workspaceId: event.workspaceId,
        });
      }
    } catch (error) {
      this.logger
        .child({ workspaceId: event.workspaceId })
        .error({ err: error }, 'Workspace deletion realtime delivery failed');
    }
  }
}
