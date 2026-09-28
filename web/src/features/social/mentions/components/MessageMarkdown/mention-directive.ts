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

const memberIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function visit(node: MarkdownNode): void {
  if (node.type === 'textDirective' && node.name === 'member') {
    const memberId = node.children?.map((child) => child.value ?? '').join('') ?? '';
    if (memberIdPattern.test(memberId)) {
      node.data = {
        hName: 'span',
        hProperties: { 'data-member-id': memberId },
      };
    }
  }

  node.children?.forEach(visit);
}

export function mentionDirective() {
  return (tree: unknown) => visit(tree as MarkdownNode);
}
