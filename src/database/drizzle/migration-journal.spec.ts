import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

interface JournalEntry {
  idx: number;
  when: number;
  tag: string;
}

// The migrator applies only migrations newer than the last one applied, so one stamped
// earlier than its predecessor would be skipped in production without an error.
test('every migration is stamped later than the one before it', () => {
  const { entries } = JSON.parse(readFileSync('drizzle/meta/_journal.json', 'utf8')) as {
    entries: JournalEntry[];
  };

  entries.slice(1).forEach((entry, index) => {
    const previous = entries[index]!;
    assert.ok(
      entry.when > previous.when,
      `${entry.tag} is stamped before ${previous.tag}; regenerate it on top of main`,
    );
  });
});
