const EVERYONE_TOKEN = ':mention[everyone]';
const typedEveryone = /(^|[^\p{L}\p{N}_.@-])@everyone(?![\p{L}\p{N}_-])/gu;

// A code span opens with a run of backticks and closes at the next run of the same length.
function codeRanges(markdown: string): [number, number][] {
  const runs = [...markdown.matchAll(/`+/g)];
  const ranges: [number, number][] = [];

  for (let index = 0; index < runs.length; index++) {
    const open = runs[index]!;
    const closeAt = runs.findIndex((run, next) => next > index && run[0].length === open[0].length);
    if (closeAt < 0) continue;

    const close = runs[closeAt]!;
    ranges.push([open.index, close.index + close[0].length]);
    index = closeAt;
  }
  return ranges;
}

/** Turns @everyone typed by hand into the mention token, as Slack does on send; code stays as written. */
export function tokenizeTypedEveryone(markdown: string): string {
  let result = '';
  let start = 0;

  for (const [codeStart, codeEnd] of codeRanges(markdown)) {
    result += markdown.slice(start, codeStart).replace(typedEveryone, `$1${EVERYONE_TOKEN}`);
    result += markdown.slice(codeStart, codeEnd);
    start = codeEnd;
  }
  return result + markdown.slice(start).replace(typedEveryone, `$1${EVERYONE_TOKEN}`);
}
