/** How a message's markdown mentions a member. */
export function memberMention(memberId: string): string {
  return `:member[${memberId}]`;
}

export function mentionsMember(markdown: string, memberId: string): boolean {
  return markdown.includes(memberMention(memberId));
}
