import { IsIn } from 'class-validator';

import { type WorkspaceAccessLevel, workspaceAccessLevels } from '../../access/types';

export class ChangeAccessLevelDto {
  @IsIn(workspaceAccessLevels)
  accessLevel!: WorkspaceAccessLevel;
}
