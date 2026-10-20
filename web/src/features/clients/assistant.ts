import type { ClientConversation } from './data';

/** How a team member addresses the assistant inside a client conversation. */
export const ASSISTANT_MENTION = '@StarMe';

export interface AssistantAnswer {
  text: string;
  /** The events the answer was put together from, e.g. `повідомлення 10:12`. */
  sources: string[];
}

/** Questions the composer offers, each answered from the client's events. */
export const assistantPrompts = [
  'що клієнт хотів?',
  'який наступний крок?',
  'що було на дзвінках?',
  'що з оплатою?',
  'які дати попереду?',
] as const;

type Topic = 'wants' | 'next' | 'calls' | 'payment' | 'dates' | 'summary';

const topics: [Topic, RegExp][] = [
  ['calls', /дзвін|дзвон|зустріч|call|meeting/i],
  ['payment', /оплат|депозит|рахун|сум|грош|pay|deposit|invoice|price/i],
  ['dates', /коли|дат|календар|дедлайн|when|date|deadline/i],
  ['next', /наступн|далі|що робити|зробити|задач|next|todo|task/i],
  ['wants', /хоч|хотів|хотіла|питав|питала|просив|просила|цікав|want|ask/i],
];

/** Whether a message is addressed to the assistant rather than to the client. */
export function isForAssistant(text: string): boolean {
  return text.trim().toLowerCase().startsWith(ASSISTANT_MENTION.toLowerCase());
}

function topicOf(question: string): Topic {
  return topics.find(([, pattern]) => pattern.test(question))?.[0] ?? 'summary';
}

function urgency(conversation: ClientConversation): string {
  if (conversation.sla) return ` SLA ${conversation.sla}.`;
  if (conversation.overdue) return ' Це вже прострочено.';
  return '';
}

/**
 * Answers a team member's question about the client from what happened: the messages, calls,
 * tasks and calendar of the conversation, and names the events it took the facts from.
 */
export function answerAbout(conversation: ClientConversation, question: string): AssistantAnswer {
  const inbound = conversation.messages.filter((message) => message.direction === 'in');
  const openTasks = conversation.tasks.filter((task) => !task.done);

  switch (topicOf(question)) {
    case 'wants': {
      const last = inbound.slice(-2);
      if (!last.length) {
        return {
          text: `${conversation.name} ще нічого не писав сам: ${conversation.state}`,
          sources: ['стан ліда'],
        };
      }
      return {
        text: `${conversation.name} писав: ${last.map((message) => `«${message.text}»`).join(' ')}`,
        sources: last.map((message) => `повідомлення ${message.at}`),
      };
    }
    case 'next':
      return {
        text:
          `Наступний крок: ${conversation.next}.${urgency(conversation)}` +
          (openTasks.length
            ? ` Відкриті задачі: ${openTasks.map((task) => `${task.title} (${task.owner}, ${task.due})`).join('; ')}.`
            : ' Відкритих задач немає.'),
        sources: ['угода', ...openTasks.map((task) => `задача «${task.title}»`)],
      };
    case 'calls':
      if (!conversation.calls.length) {
        return { text: 'Дзвінків і зустрічей з цим клієнтом ще не було.', sources: [] };
      }
      return {
        text: conversation.calls
          .map(
            (call) =>
              `${call.at}, ${call.duration}: ${call.summary}${call.open ? `; відкрите — ${call.open}` : ''}.`,
          )
          .join(' '),
        sources: conversation.calls.map((call) => `дзвінок ${call.at}`),
      };
    case 'payment':
      return {
        text:
          `${conversation.programme}, сума ${conversation.sum}, етап «${conversation.stage}».` +
          ` Далі: ${conversation.next}.${urgency(conversation)}`,
        sources: ['угода'],
      };
    case 'dates':
      if (!conversation.events.length) {
        return { text: 'У календарі клієнта поки немає подій.', sources: [] };
      }
      return {
        text: conversation.events.map((event) => `${event.date} — ${event.text}`).join('; ') + '.',
        sources: conversation.events.map((event) => `календар ${event.date}`),
      };
    case 'summary':
      return {
        text: `${conversation.state} Наступний крок: ${conversation.next}.${urgency(conversation)}`,
        sources: ['стан ліда', 'угода'],
      };
  }
}
