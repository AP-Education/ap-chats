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

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function visit(node: MarkdownNode): void {
  const label = node.children?.map((child) => child.value ?? '').join('') ?? '';

  if (node.type === 'textDirective' && node.name === 'member' && uuidPattern.test(label)) {
    node.data = { hName: 'span', hProperties: { 'data-member-id': label } };
  }
  if (node.type === 'textDirective' && node.name === 'channel' && uuidPattern.test(label)) {
    node.data = { hName: 'span', hProperties: { 'data-channel-id': label } };
  }
  if (node.type === 'textDirective' && node.name === 'mention' && label === 'everyone') {
    node.data = { hName: 'span', hProperties: { 'data-mention': label } };
  }

  node.children?.forEach(visit);
}

export function mentionDirective() {
  return (tree: unknown) => visit(tree as MarkdownNode);
}
