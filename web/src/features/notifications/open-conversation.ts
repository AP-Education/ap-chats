import { matchPath } from 'react-router-dom';

// Every page that shows a conversation: a channel, a direct message, or one opened from calls.
const conversationPaths = ['/channels/:channelId', '/direct/:channelId', '/calls/:channelId'];

/** The conversation a Chats path shows, if it shows one. */
export function openConversationAt(pathname: string): string | undefined {
  return conversationPaths.map((path) => matchPath(path, pathname)?.params.channelId).find(Boolean);
}
