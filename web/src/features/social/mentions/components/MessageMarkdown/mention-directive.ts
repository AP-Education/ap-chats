import { type MentionToken, readToken } from '../../mention-tokens';

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

function attributes(token: MentionToken): Record<string, string> {
  if (token.kind === 'everyone') return { 'data-mention': 'everyone' };
  if (token.kind === 'channel') return { 'data-channel-id': token.id };
  return { 'data-member-id': token.id };
}

function visit(node: MarkdownNode): void {
  if (node.type === 'textDirective') {
    const label = node.children?.map((child) => child.value ?? '').join('') ?? '';
    const token = readToken(node.name, label);
    if (token) node.data = { hName: 'span', hProperties: attributes(token) };
  }

  node.children?.forEach(visit);
}

export function mentionDirective() {
  return (tree: unknown) => visit(tree as MarkdownNode);
}
