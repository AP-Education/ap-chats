import { IsIn, IsUUID, ValidateIf } from 'class-validator';

import { type Principal, type PrincipalKind, principalKinds } from '../types';

export class PrincipalDto {
  @IsIn(principalKinds)
  kind!: PrincipalKind;

  @ValidateIf((principal: PrincipalDto) => principal.kind === 'role')
  @IsUUID()
  roleId?: string;

  @ValidateIf((principal: PrincipalDto) => principal.kind === 'member')
  @IsUUID()
  memberId?: string;
}

export function toPrincipal(dto: PrincipalDto): Principal {
  switch (dto.kind) {
    case 'everyone':
      return { kind: 'everyone' };
    case 'role':
      return { kind: 'role', roleId: dto.roleId! };
    case 'member':
      return { kind: 'member', memberId: dto.memberId! };
  }
}
