export const roleColors = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#64748b',
] as const;

export function isPresetRoleColor(color: string): boolean {
  return (roleColors as readonly string[]).includes(color.toLowerCase());
}
