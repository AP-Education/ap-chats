const LETTER = /[\p{L}\p{N}]/u;
const ACRONYM = /^\p{Lu}{2,3}$/u;

function firstLetter(word: string): string {
  return word.match(LETTER)?.[0] ?? '';
}

/** Corporate initials: first and last name ("Олена Коваль" is "ОК"), one letter for a
 * single word, and a leading acronym kept whole, so "AP Education" stays "AP". */
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
