import type { ClientConversation, ClientMessage } from './data';

/** How a team member addresses the assistant inside a client conversation. */
export const ASSISTANT_MENTION = '@StarMe';

export interface AssistantAnswer {
  text: string;
  /** The events the answer was put together from, e.g. `message 10:12`. */
  sources: string[];
}

/** Questions every client conversation offers, one tap each. */
export const assistantPrompts = [
  'what did the client want?',
  "what's the next step?",
  'what happened on the calls?',
  "what's the payment status?",
  'which dates are coming up?',
] as const;

/** One message of what the assistant reads; the last one is the question. */
export interface AssistantTurn {
  role: 'user' | 'assistant';
  author?: string;
  text: string;
}

// `@StarMe`, and the ways it gets typed in a hurry: `@starme`, `@Star me`, `@Stram me`.
const mention = /^@\s*st[a-z]{0,4}\s?me\b/i;

/** Whether a message is addressed to the assistant rather than to the client. */
export function isForAssistant(text: string): boolean {
  return mention.test(text.trim());
}

/** The question itself, without the mention. */
export function questionOf(text: string): string {
  return text.trim().replace(mention, '').trim();
}

/** The client card as the assistant reads it: everything the team knows about the lead. */
export function clientBrief(conversation: ClientConversation): string {
  const lines = [
    `CRM client card for ${conversation.name} (crm-${conversation.id}), ESEI International Business School.`,
    `Deal: ${conversation.programme}, funnel ${conversation.funnel}, stage ${conversation.stage}, amount ${conversation.sum}, owner ${conversation.owner}, source ${conversation.source}.`,
    `Next step: ${conversation.next}${conversation.sla ? `, SLA ${conversation.sla}` : ''}${conversation.overdue ? ', overdue' : ''}.`,
    `Channel ${conversation.channel}, country ${conversation.country}, language ${conversation.language}, intake ${conversation.intake}.`,
    `State: ${conversation.state}`,
    conversation.tasks.length
      ? `Open tasks: ${conversation.tasks.map((task) => `${task.title} (${task.owner}, due ${task.due})`).join('; ')}.`
      : 'No open tasks.',
    conversation.calls.length
      ? `Calls: ${conversation.calls.map((call) => `${call.at}, ${call.duration}: ${call.summary}${call.open ? `; still open: ${call.open}` : ''}`).join('; ')}.`
      : 'No calls yet.',
    conversation.events.length
      ? `Client calendar: ${conversation.events.map((event) => `${event.date} ${event.text}`).join('; ')}.`
      : 'Nothing in the client calendar.',
  ];
  return lines.join('\n');
}

/**
 * What the assistant reads to answer: the client card, then the conversation as it happened,
 * team notes and the assistant's own earlier answers included, then the question.
 */
export function assistantTurns(
  conversation: ClientConversation,
  messages: readonly ClientMessage[],
  question: string,
  asker: string,
): AssistantTurn[] {
  const history = messages.map((message): AssistantTurn => {
    if (message.direction === 'assistant') return { role: 'assistant', text: message.text };
    const author =
      message.direction === 'in'
        ? conversation.name
        : message.direction === 'system'
          ? 'CRM'
          : (message.by ?? 'Team');
    return { role: 'user', author, text: `[${message.at}] ${message.text}` };
  });
  return [
    { role: 'user', author: 'CRM', text: clientBrief(conversation) },
    ...history,
    { role: 'user', author: asker, text: `${ASSISTANT_MENTION} ${question}` },
  ];
}

type Topic = 'wants' | 'next' | 'calls' | 'payment' | 'dates' | 'summary';

const topics: [Topic, RegExp][] = [
  ['calls', /call|meeting|дзвін|зустріч/i],
  ['payment', /pay|deposit|invoice|price|fee|amount|оплат|депозит/i],
  ['dates', /when|date|deadline|calendar|coming up|коли|дат/i],
  ['next', /next|todo|task|to do|наступн|задач/i],
  ['wants', /want|ask|need|interest|хотів|хотіла|питав/i],
];

function urgency(conversation: ClientConversation): string {
  if (conversation.sla) return ` SLA ${conversation.sla}.`;
  if (conversation.overdue) return ' It is already overdue.';
  return '';
}

/**
 * The answer when the assistant cannot be reached: built from the client's own events, naming
 * the ones it used.
 */
export function answerAbout(conversation: ClientConversation, question: string): AssistantAnswer {
  const inbound = conversation.messages.filter((message) => message.direction === 'in');
  const openTasks = conversation.tasks.filter((task) => !task.done);
  const topic = topics.find(([, pattern]) => pattern.test(question))?.[0] ?? 'summary';

  switch (topic) {
    case 'wants': {
      const last = inbound.slice(-2);
      if (!last.length) {
        return {
          text: `${conversation.name} has not written yet: ${conversation.state}`,
          sources: ['lead state'],
        };
      }
      return {
        text: `${conversation.name} wrote: ${last.map((message) => `"${message.text}"`).join(' ')}`,
        sources: last.map((message) => `message ${message.at}`),
      };
    }
    case 'next':
      return {
        text:
          `Next step: ${conversation.next}.${urgency(conversation)}` +
          (openTasks.length
            ? ` Open tasks: ${openTasks.map((task) => `${task.title} (${task.owner}, ${task.due})`).join('; ')}.`
            : ' No open tasks.'),
        sources: ['deal', ...openTasks.map((task) => `task "${task.title}"`)],
      };
    case 'calls':
      if (!conversation.calls.length) {
        return { text: 'There have been no calls or meetings with this client yet.', sources: [] };
      }
      return {
        text: conversation.calls
          .map(
            (call) =>
              `${call.at}, ${call.duration}: ${call.summary}${call.open ? `; still open: ${call.open}` : ''}.`,
          )
          .join(' '),
        sources: conversation.calls.map((call) => `call ${call.at}`),
      };
    case 'payment':
      return {
        text:
          `${conversation.programme}, amount ${conversation.sum}, stage ${conversation.stage}.` +
          ` Next: ${conversation.next}.${urgency(conversation)}`,
        sources: ['deal'],
      };
    case 'dates':
      if (!conversation.events.length) {
        return { text: 'Nothing in the client calendar yet.', sources: [] };
      }
      return {
        text: conversation.events.map((event) => `${event.date}: ${event.text}`).join('; ') + '.',
        sources: conversation.events.map((event) => `calendar ${event.date}`),
      };
    case 'summary':
      return {
        text: `${conversation.state} Next step: ${conversation.next}.${urgency(conversation)}`,
        sources: ['lead state', 'deal'],
      };
  }
}
