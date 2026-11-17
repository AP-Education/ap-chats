import type { UpdateSummary } from './admin-api';

function percent(part: number, whole: number): string {
  return whole === 0 ? '—' : `${((part / whole) * 100).toFixed(1)}%`;
}

/** A markdown table for the job summary: what is out, how far, and how its launches go. */
export function statusTable(updates: readonly UpdateSummary[]): string {
  if (updates.length === 0) return '_No updates on this channel yet._';
  const rows = updates.map((update) => {
    const what =
      update.kind === 'rollback_to_embedded'
        ? 'back to the store bundle'
        : update.sourceUpdateId
          ? `republish of \`${update.sourceUpdateId.slice(0, 8)}\``
          : (update.notes ?? '');
    return [
      `\`${update.id}\``,
      update.platform,
      String(update.buildNumber),
      update.status,
      `${update.rolloutPercent}%${update.mandatory ? ' mandatory' : ''}`,
      String(update.launches),
      percent(update.successes, update.launches),
      String(update.emergencyLaunches),
      update.createdAt.slice(0, 16).replace('T', ' '),
      update.gitCommit ? `\`${update.gitCommit.slice(0, 7)}\`` : '',
      what.replaceAll('|', '\\|').replaceAll('\n', ' '),
    ].join(' | ');
  });
  return [
    '| Update | Platform | Build | Status | Rollout | Launches | Success | Emergency | Published (UTC) | Commit | What |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((row) => `| ${row} |`),
  ].join('\n');
}
