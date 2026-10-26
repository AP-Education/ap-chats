interface MarkdownNode {
  type: string;
  value?: string;
  children?: MarkdownNode[];
  data?: { hName?: string; hProperties?: Record<string, string> };
}

const MARK = '||';

type Piece = MarkdownNode | typeof MARK;

const text = (value: string): MarkdownNode => ({ type: 'text', value });

function piecesOf(children: MarkdownNode[]): Piece[] {
  const pieces: Piece[] = [];
  for (const child of children) {
    if (child.type !== 'text' || !child.value?.includes(MARK)) {
      pieces.push(child);
      continue;
    }
    child.value.split(MARK).forEach((part, index) => {
      if (index) pieces.push(MARK);
      if (part) pieces.push(text(part));
    });
  }
  return pieces;
}

const isBlank = (nodes: MarkdownNode[]) =>
  nodes.every((node) => node.type === 'text' && !node.value?.trim());

function spoiler(children: MarkdownNode[]): MarkdownNode {
  return { type: 'spoiler', children, data: { hName: 'span', hProperties: { dataSpoiler: '' } } };
}

// Marks pair in order within one run of text; one left without a pair, or around nothing, reads as typed.
function wrap(children: MarkdownNode[]): MarkdownNode[] {
  const shown: MarkdownNode[] = [];
  let hidden: MarkdownNode[] | null = null;

  for (const piece of piecesOf(children)) {
    if (piece !== MARK) {
      (hidden ?? shown).push(piece);
    } else if (!hidden) {
      hidden = [];
    } else {
      shown.push(...(isBlank(hidden) ? [text(MARK), ...hidden, text(MARK)] : [spoiler(hidden)]));
      hidden = null;
    }
  }
  return hidden ? [...shown, text(MARK), ...hidden] : shown;
}

function visit(node: MarkdownNode): void {
  if (!node.children) return;
  node.children.forEach(visit);
  node.children = wrap(node.children);
}

/**
 * Discord's ||spoiler||: text hidden until someone opens it. Code keeps its pipes, as it is not
 * text. The server reads the same marks in src/components/social/content/message-markdown.ts.
 */
export function spoilerSyntax() {
  return (tree: unknown) => visit(tree as MarkdownNode);
}
