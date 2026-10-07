const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const conversationPath = /^\/(channels|direct)\/[0-9a-f-]{36}$/iu;

/** The only route a notification may open: one conversation of one workspace in this app. */
export function pushTarget(url: unknown): string | null {
  if (typeof url !== 'string') return null;

  let target: URL;
  try {
    target = new URL(url, window.location.origin);
  } catch {
    return null;
  }

  const workspaceId = target.searchParams.get('pushWorkspace');
  const isConversation =
    target.origin === window.location.origin && conversationPath.test(target.pathname);
  if (!isConversation || !workspaceId || !uuid.test(workspaceId)) return null;

  return target.pathname + target.search;
}
