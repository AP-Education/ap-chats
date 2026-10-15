export const WORKSPACE_CREATED_EVENT = 'workspaces.workspace.created';

export class WorkspaceCreatedEvent {
  constructor(public readonly workspaceId: string) {}
}
