export interface NameMatch {
  score: number;
  // The least similar pair of aligned name parts; one wrong surname must not hide behind a right first name.
  weakest: number;
}

const NO_MATCH: NameMatch = { score: 0, weakest: 0 };
const PREFIX_SIMILARITY = 0.85;
const INITIAL_SIMILARITY = 0.8;
// A lone first name or surname fits too many people to ever link on its own.
const SINGLE_PART_CAP = 0.8;
// Initials and two-letter scraps ("nata_a_a", "AP") can support a match but never carry one.
const ANCHOR_MIN_LENGTH = 3;
const EXTRA_PART_PENALTY = 0.97;

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'h',
  ґ: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  є: 'ye',
  ж: 'zh',
  з: 'z',
  и: 'y',
  і: 'i',
  ї: 'yi',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  "'": '',
  ʼ: '',
  '’': '',
};

// Folds the spellings transliteration produces for one sound: Oleksii/Alexey, Yuliia/Julia, Hanna/Ganna.
const SKELETON_RULES: [RegExp, string][] = [
  [/shch|sch/g, 's'],
  [/kh/g, 'h'],
  [/zh/g, 'z'],
  [/ch/g, 'c'],
  [/sh/g, 's'],
  [/ts|tz/g, 'c'],
  [/ph/g, 'f'],
  [/x/g, 'ks'],
  [/w/g, 'v'],
  [/q/g, 'k'],
  [/[yj]/g, 'i'],
  [/g/g, 'h'],
  [/(.)\1+/g, '$1'],
];

function skeleton(part: string): string {
  return SKELETON_RULES.reduce(
    (value, [pattern, replacement]) => value.replace(pattern, replacement),
    part,
  );
}

function latinParts(name: string): string[] {
  const spaced = name
    .normalize('NFC')
    .replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2')
    .toLowerCase()
    // Ukrainian transliteration writes зг as zgh, so Згоба never reads as Жоба.
    .replace(/зг/g, 'zgh');
  const latin = [...spaced].map((char) => CYRILLIC_TO_LATIN[char] ?? char).join('');
  const plain = latin.normalize('NFKD').replace(/\p{M}/gu, '');

  return plain
    .split(/[^a-z]+/)
    .filter(Boolean)
    .map(skeleton);
}

// What colleagues call each other on Discord, read as the name an account holds: Оля is Ольга.
const FULL_NAMES = new Map(
  Object.entries({
    Оля: 'Ольга',
    Таня: 'Тетяна',
    Юля: 'Юлія',
    Саша: 'Олександр',
    Вова: 'Володимир',
    Влад: 'Владислав',
    Ліза: 'Єлизавета',
    Настя: 'Анастасія',
    Катя: 'Катерина',
    Женя: 'Євген',
    Діма: 'Дмитро',
    Іра: 'Ірина',
    Наташа: 'Наталія',
    Аня: 'Анна',
    Маша: 'Марія',
    Даша: 'Дарія',
    Вітя: 'Віктор',
    Віка: 'Вікторія',
    Тася: 'Таїсія',
    Світа: 'Світлана',
    Лєна: 'Олена',
    Ліля: 'Лілія',
    Соня: 'Софія',
    Христя: 'Христина',
    Галя: 'Галина',
    Люда: 'Людмила',
    Надя: 'Надія',
    Валя: 'Валентина',
    Люба: 'Любов',
    Ніка: 'Вероніка',
    Ваня: 'Іван',
    Петя: 'Петро',
    Миша: 'Михайло',
    Коля: 'Микола',
    Бодя: 'Богдан',
    Ростик: 'Ростислав',
    Стас: 'Станіслав',
    Макс: 'Максим',
    Юра: 'Юрій',
    Льоша: 'Олексій',
    Костя: 'Костянтин',
    Вася: 'Василь',
    Толя: 'Анатолій',
  }).map(([short, full]) => [latinParts(short)[0]!, latinParts(full)[0]!]),
);

/** "Влад Поліщук", "vlad.polishchuk" and "VladPolishchuk" all become comparable Latin parts. */
export function nameParts(name: string): string[] {
  return latinParts(name).map((part) => FULL_NAMES.get(part) ?? part);
}

function levenshtein(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const substitution = previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(previous[j]! + 1, current[j - 1]! + 1, substitution);
    }
    previous = current;
  }
  return previous[b.length]!;
}

function spellingSimilarity(a: string, b: string): number {
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

function partSimilarity(a: string, b: string): number {
  if (a === b) return 1;

  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  const spelling = spellingSimilarity(a, b);
  if (shorter.length === 1) return longer.startsWith(shorter) ? INITIAL_SIMILARITY : 0;
  if (shorter.length >= 3 && longer.startsWith(shorter))
    return Math.max(spelling, PREFIX_SIMILARITY);
  return spelling;
}

// A handle like "vpolishchuk" or "polishchukvlad" glues a full name into one part.
function gluedSpellings(parts: string[]): string[] {
  const spellings = [parts.join(''), [...parts].reverse().join('')];
  for (const first of parts) {
    for (const second of parts) {
      if (first === second) continue;
      spellings.push(first + second, first[0] + second);
    }
  }
  return spellings;
}

function isAnchor(a: string, b: string, similarity: number): boolean {
  return Math.min(a.length, b.length) >= ANCHOR_MIN_LENGTH && similarity >= PREFIX_SIMILARITY;
}

function matchOnePartAgainstMany(part: string, parts: string[]): NameMatch {
  if (part.length < ANCHOR_MIN_LENGTH) return NO_MATCH;

  const glued = Math.max(
    ...gluedSpellings(parts).map((spelling) => spellingSimilarity(part, spelling)),
  );
  const lone = Math.min(
    SINGLE_PART_CAP,
    Math.max(...parts.map((other) => partSimilarity(part, other))),
  );
  const score = Math.max(glued, lone);

  return { score, weakest: score };
}

// Pairs the most similar parts first, so word order and a middle name don't matter.
function alignParts(fewer: string[], more: string[]): NameMatch {
  const pairs = fewer
    .flatMap((a, i) => more.map((b, j) => ({ i, j, similarity: partSimilarity(a, b) })))
    .sort((x, y) => y.similarity - x.similarity);

  const usedFewer = new Set<number>();
  const usedMore = new Set<number>();
  let weighted = 0;
  let weakest = 1;
  let hasAnchor = false;
  for (const pair of pairs) {
    if (usedFewer.has(pair.i) || usedMore.has(pair.j)) continue;
    usedFewer.add(pair.i);
    usedMore.add(pair.j);
    weighted += pair.similarity * fewer[pair.i]!.length;
    weakest = Math.min(weakest, pair.similarity);
    hasAnchor ||= isAnchor(fewer[pair.i]!, more[pair.j]!, pair.similarity);
  }
  if (!hasAnchor) return NO_MATCH;

  const totalLength = fewer.reduce((sum, part) => sum + part.length, 0);
  const penalty = EXTRA_PART_PENALTY ** (more.length - fewer.length);
  return { score: (weighted / totalLength) * penalty, weakest };
}

export function compareNames(a: string[], b: string[]): NameMatch {
  if (!a.length || !b.length) return NO_MATCH;

  const [fewer, more] = a.length <= b.length ? [a, b] : [b, a];
  if (fewer.length === 1 && more.length > 1) return matchOnePartAgainstMany(fewer[0]!, more);
  return alignParts(fewer, more);
}

/** The best match across every name a person goes by. */
export function compareAnyName(names: string[][], other: string[]): NameMatch {
  return names
    .map((parts) => compareNames(parts, other))
    .reduce((best, match) => (match.score > best.score ? match : best), NO_MATCH);
}
