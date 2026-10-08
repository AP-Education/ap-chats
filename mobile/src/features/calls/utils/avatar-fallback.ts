// Mirrors web's Avatar, which takes antd's preset palettes (shades 1 and 2 for the
// tile, 8 for the initials) in this order; calls are always dark, so these are the
// dark-algorithm shades.
const AVATAR_COLORS = [
  { from: '#2a1215', to: '#431418', initials: '#f37370' },
  { from: '#2b1d11', to: '#442a11', initials: '#f3b765' },
  { from: '#112123', to: '#113536', initials: '#58d1c9' },
  { from: '#162312', to: '#1d3712', initials: '#8fd460' },
  { from: '#111a2c', to: '#112545', initials: '#65a9f3' },
  { from: '#1a1325', to: '#24163a', initials: '#ab7ae0' },
  { from: '#291321', to: '#40162f', initials: '#f37fb7' },
] as const;

const LETTER = /[\p{L}\p{N}]/u;
const ACRONYM = /^\p{Lu}{2,3}$/u;

export function avatarColors(name: string): (typeof AVATAR_COLORS)[number] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

function firstLetter(word: string): string {
  return word.match(LETTER)?.[0] ?? '';
}

export function avatarInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/u)
    .filter((word) => LETTER.test(word));
  const [first, ...rest] = words;

  if (!first) return '?';
  if (ACRONYM.test(first)) return first;

  const last = rest.at(-1) ?? '';
  return (firstLetter(first) + firstLetter(last)).toUpperCase();
}
