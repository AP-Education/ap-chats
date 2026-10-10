const STORAGE_KEY = 'ap-chats:reaction-usage';
const QUICK_REACTION_COUNT = 6;
const REMEMBERED_REACTIONS = 24;
const DEFAULT_REACTIONS = ['👍', '❤️', '😂', '🔥', '🎉', '👀'];

function readUsage(): Record<string, number> {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as unknown;
    return stored && typeof stored === 'object' ? (stored as Record<string, number>) : {};
  } catch {
    return {};
  }
}

/** The person's most used reactions first, topped up with the defaults until they have a habit. */
export function quickReactions(): string[] {
  const usage = readUsage();
  const used = Object.keys(usage).sort((left, right) => usage[right]! - usage[left]!);
  return [...new Set([...used, ...DEFAULT_REACTIONS])].slice(0, QUICK_REACTION_COUNT);
}

export function recordReaction(emoji: string): void {
  const usage = readUsage();
  usage[emoji] = (usage[emoji] ?? 0) + 1;
  const kept = Object.entries(usage)
    .sort(([, left], [, right]) => right - left)
    .slice(0, REMEMBERED_REACTIONS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(kept)));
  } catch {
    // A private window keeps working with the defaults.
  }
}
