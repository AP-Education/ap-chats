interface MarkdownNode {
  type: string;
  value?: string;
  url?: string;
  children?: MarkdownNode[];
}

const BARE_URL = /\b(?:https?:\/\/|www\.)[^\s<>]+/giu;
// Sentence punctuation after a link belongs to the sentence, as in GFM autolinks.
const TRAILING_PUNCTUATION = /[.,:;!?'"*_~]+$/u;
const UNLINKED = new Set(['link', 'linkReference', 'inlineCode', 'code', 'textDirective']);

function trimUrl(raw: string): string {
  let url = raw.replace(TRAILING_PUNCTUATION, '');
  // A closing parenthesis ends the link unless the link opened one itself.
  while (url.endsWith(')') && url.split('(').length < url.split(')').length) {
    url = url.slice(0, -1).replace(TRAILING_PUNCTUATION, '');
  }
  return url;
}

export function splitBareLinks(text: string): MarkdownNode[] {
  const nodes: MarkdownNode[] = [];
  let start = 0;

  for (const match of text.matchAll(BARE_URL)) {
    const label = trimUrl(match[0]);
    if (!label.includes('.')) continue;

    if (match.index > start) nodes.push({ type: 'text', value: text.slice(start, match.index) });
    const url = label.toLowerCase().startsWith('www.') ? `https://${label}` : label;
    nodes.push({ type: 'link', url, children: [{ type: 'text', value: label }] });
    start = match.index + label.length;
  }

  if (start < text.length) nodes.push({ type: 'text', value: text.slice(start) });
  return nodes;
}

function visit(node: MarkdownNode): void {
  if (!node.children || UNLINKED.has(node.type)) return;

  node.children = node.children.flatMap((child) =>
    child.type === 'text' && child.value ? splitBareLinks(child.value) : [child],
  );
  node.children.forEach(visit);
}

export function bareLinks() {
  return (tree: unknown) => visit(tree as MarkdownNode);
}
