export type WorkspaceServerToClientEvents = {
  'workspaces:changed': (event: {
    type: 'workspaces.workspace.deleted';
    workspaceId: string;
  }) => void;
};
