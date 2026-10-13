import { readToken, tokenAttributes } from '../../mention-tokens';

interface MarkdownNode {
  type: string;
  name?: string;
  value?: string;
  children?: MarkdownNode[];
  data?: {
    hName?: string;
    hProperties?: Record<string, string>;
  };
}

function visit(node: MarkdownNode): void {
  if (node.type === 'textDirective') {
    const label = node.children?.map((child) => child.value ?? '').join('') ?? '';
    const token = readToken(node.name, label);
    if (token) node.data = { hName: 'span', hProperties: tokenAttributes(token) };
  }

  node.children?.forEach(visit);
}

export function mentionDirective() {
  return (tree: unknown) => visit(tree as MarkdownNode);
}
