import type { AssistantTurn } from '../assistant';

const aiNativeUrl = (import.meta.env.VITE_AI_NATIVE_URL || 'https://ai.ap-platform.online').replace(
  /\/$/,
  '',
);

// The agent may take several rounds when it uses tools.
const RUN_TIMEOUT_MS = 120_000;

/**
 * Asks StarMe, AI Native's company assistant, as the signed-in person: the same agent the team
 * chats reach through the server, called here from the browser with the person's own token.
 */
export async function askStarMe(turns: AssistantTurn[], accessToken: string): Promise<string> {
  const response = await fetch(`${aiNativeUrl}/api/agents/default/run`, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messages: turns, stream: false }),
    signal: AbortSignal.timeout(RUN_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`StarMe answered ${response.status}`);
  const run = (await response.json()) as { text?: unknown };
  if (typeof run.text !== 'string' || !run.text.trim()) throw new Error('StarMe gave no answer');
  return run.text;
}
