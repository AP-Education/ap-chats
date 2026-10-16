import { readToken, tokenAttributes } from '../../mention-tokens';

interface MarkdownNode {
  type: string;
  name?: string;
  attributes?: Record<string, unknown> | null;
  value?: string;
  children?: MarkdownNode[];
  position?: { start: { offset?: number }; end: { offset?: number } };
  data?: {
    hName?: string;
    hProperties?: Record<string, string>;
  };
}

const DIRECTIVES = new Set(['textDirective', 'leafDirective', 'containerDirective']);

// Text is stored as typed, so a directive that names no reference, such as the `:30` in 10:30, is
// just what someone wrote and reads as that.
function asTyped(node: MarkdownNode, source: string): MarkdownNode {
  const text = {
    type: 'text',
    value: source.slice(node.position?.start.offset, node.position?.end.offset),
  };
  return node.type === 'textDirective' ? text : { type: 'paragraph', children: [text] };
}

function reference(node: MarkdownNode, source: string): MarkdownNode {
  const label = node.children?.map((child) => child.value ?? '').join('') ?? '';
  // The server takes a reference only bare, so one with attributes mentions no one here either.
  const isBare = node.type === 'textDirective' && !Object.keys(node.attributes ?? {}).length;
  const token = isBare ? readToken(node.name, label) : null;
  if (!token) return asTyped(node, source);

  node.data = { hName: 'span', hProperties: tokenAttributes(token) };
  return node;
}

function visit(node: MarkdownNode, source: string): void {
  if (!node.children) return;

  node.children = node.children.map((child) => {
    if (DIRECTIVES.has(child.type)) return reference(child, source);
    visit(child, source);
    return child;
  });
}

export function mentionDirective() {
  return (tree: unknown, file: { value: unknown }) =>
    visit(tree as MarkdownNode, String(file.value));
}
