import { IsIn, IsOptional } from 'class-validator';

export class ListChannelsQueryDto {
  /** `all` lists every channel of the workspace, for its managers. */
  @IsOptional()
  @IsIn(['mine', 'all'])
  scope?: 'mine' | 'all';
}
