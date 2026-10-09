export const WORKSPACE_DELETED_EVENT = 'workspaces.workspace.deleted';

export class WorkspaceDeletedEvent {
  constructor(
    public readonly workspaceId: string,
    // Captured before the delete: the membership rows go with the workspace.
    public readonly memberUserIds: string[],
  ) {}
}
