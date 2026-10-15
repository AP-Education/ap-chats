import { apiRequest, jsonInit } from '@/shared/api/http';

import type { Role, RoleInput, RoleMember } from '../types';

function rolesUrl(workspaceId: string, roleId?: string): string {
  return `/api/workspaces/${workspaceId}/roles${roleId ? `/${roleId}` : ''}`;
}

export function listRoles(token: string, workspaceId: string): Promise<Role[]> {
  return apiRequest(rolesUrl(workspaceId), token);
}

export function createRole(token: string, workspaceId: string, input: RoleInput): Promise<Role> {
  return apiRequest(rolesUrl(workspaceId), token, jsonInit('POST', input));
}

export function updateRole(
  token: string,
  workspaceId: string,
  roleId: string,
  input: Partial<RoleInput>,
): Promise<Role> {
  return apiRequest(rolesUrl(workspaceId, roleId), token, jsonInit('PATCH', input));
}

export function reorderRoles(
  token: string,
  workspaceId: string,
  roleIds: string[],
): Promise<Role[]> {
  return apiRequest(`${rolesUrl(workspaceId)}/order`, token, jsonInit('PUT', { roleIds }));
}

export function deleteRole(token: string, workspaceId: string, roleId: string): Promise<void> {
  return apiRequest(rolesUrl(workspaceId, roleId), token, { method: 'DELETE' });
}

export function listRoleMembers(
  token: string,
  workspaceId: string,
  roleId: string,
): Promise<RoleMember[]> {
  return apiRequest(`${rolesUrl(workspaceId, roleId)}/members`, token);
}

export function addRoleMembers(
  token: string,
  workspaceId: string,
  roleId: string,
  memberIds: string[],
): Promise<void> {
  return apiRequest(
    `${rolesUrl(workspaceId, roleId)}/members`,
    token,
    jsonInit('POST', { memberIds }),
  );
}

export function removeRoleMember(
  token: string,
  workspaceId: string,
  roleId: string,
  memberId: string,
): Promise<void> {
  return apiRequest(`${rolesUrl(workspaceId, roleId)}/members/${memberId}`, token, {
    method: 'DELETE',
  });
}
