export const principalKinds = ['everyone', 'role', 'member'] as const;
export type PrincipalKind = (typeof principalKinds)[number];

/** Whom a permission is given to: the whole workspace, everyone in a role, or one person. */
export type Principal =
  { kind: 'everyone' } | { kind: 'role'; roleId: string } | { kind: 'member'; memberId: string };
