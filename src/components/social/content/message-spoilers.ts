interface MarkdownNode {
  type: string;
  value?: string | undefined;
  children?: MarkdownNode[] | undefined;
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
      const spoiler = { type: 'spoiler', children: hidden };
      shown.push(...(isBlank(hidden) ? [text(MARK), ...hidden, text(MARK)] : [spoiler]));
      hidden = null;
    }
  }
  return hidden ? [...shown, text(MARK), ...hidden] : shown;
}

/**
 * Sets Discord's ||spoiler|| apart as `spoiler` nodes, the text stored as typed either way. The
 * client reads the same marks in web/src/features/social/mentions/components/MessageMarkdown.
 */
export function withSpoilers<Node extends MarkdownNode>(node: Node): Node {
  if (!node.children) return node;
  return { ...node, children: wrap(node.children.map(withSpoilers)) };
}
