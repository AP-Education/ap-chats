export type ConversationSection = 'channels' | 'direct';

function storageKey(
  identity: string | undefined,
  workspaceId: string,
  section: ConversationSection,
) {
  return identity ? `ap-chats:last-conversation:${identity}:${workspaceId}:${section}` : null;
}

export function getLastConversation(
  identity: string | undefined,
  workspaceId: string,
  section: ConversationSection,
) {
  const key = storageKey(identity, workspaceId, section);
  if (!key) return null;

  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function rememberConversation(
  identity: string | undefined,
  workspaceId: string,
  section: ConversationSection,
  channelId: string,
) {
  const key = storageKey(identity, workspaceId, section);
  if (!key) return;

  try {
    localStorage.setItem(key, channelId);
  } catch {
    return undefined;
  }
}

export function forgetConversation(
  identity: string | undefined,
  workspaceId: string,
  section: ConversationSection,
  channelId: string,
) {
  const key = storageKey(identity, workspaceId, section);
  if (!key) return false;

  try {
    if (localStorage.getItem(key) !== channelId) return false;
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
