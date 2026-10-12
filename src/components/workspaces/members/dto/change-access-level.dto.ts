import { IsIn } from 'class-validator';

import { type WorkspaceAccessLevel, workspaceAccessLevels } from '../types';

export class ChangeAccessLevelDto {
  @IsIn(workspaceAccessLevels)
  accessLevel!: WorkspaceAccessLevel;
}
