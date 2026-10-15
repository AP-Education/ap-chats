/** The order after dropping `movedId` onto `targetId`: it takes the target's place, the rest shift. */
export function moveRole(roleIds: string[], movedId: string, targetId: string): string[] {
  const from = roleIds.indexOf(movedId);
  const to = roleIds.indexOf(targetId);
  if (from === -1 || to === -1 || from === to) return roleIds;

  const reordered = roleIds.filter((id) => id !== movedId);
  reordered.splice(to, 0, movedId);
  return reordered;
}
