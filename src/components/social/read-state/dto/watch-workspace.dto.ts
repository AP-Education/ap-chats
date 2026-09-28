import { IsUUID } from 'class-validator';

export class WatchWorkspaceDto {
  @IsUUID()
  workspaceId!: string;
}
