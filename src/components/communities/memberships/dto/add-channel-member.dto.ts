import { IsUUID } from 'class-validator';

export class AddChannelMemberDto {
  @IsUUID()
  memberId!: string;
}
