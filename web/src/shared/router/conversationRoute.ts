import { useMatches } from 'react-router-dom';

export const conversationRoute = { isConversation: true } as const;

export function useIsConversationRoute() {
  return useMatches().some((match) => {
    const handle = match.handle as { isConversation?: boolean } | undefined;
    return handle?.isConversation === true;
  });
}
