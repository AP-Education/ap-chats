/**
 * Demo client conversations for the university deployment. Each one belongs to a deal of
 * the CRM funnel and has its id, so a funnel card opens the conversation it stands for.
 */

export type ClientChannel =
  'WhatsApp' | 'Telegram' | 'Instagram' | 'Email' | 'Messenger' | 'TikTok' | 'Website' | 'LinkedIn';

export type FunnelCode = 'BB' | 'MA';

export interface ClientMessage {
  id: string;
  /**
   * `in` from the client, `out` from the team, `system` a note of what happened; `note` a team
   * member's word to the assistant and `assistant` its answer, both kept from the client.
   */
  direction: 'in' | 'out' | 'system' | 'note' | 'assistant';
  text: string;
  at: string;
  by?: string;
  /** For an assistant's answer: the events it was put together from. */
  sources?: string[];
  /** For an assistant's answer: still on its way. */
  pending?: boolean;
  /** For an assistant's answer: built from the events because StarMe could not be reached. */
  offline?: boolean;
}

export interface ClientTask {
  title: string;
  owner: string;
  due: string;
  priority?: 'high';
  done?: boolean;
}

export interface ClientCall {
  at: string;
  duration: string;
  summary: string;
  open?: string;
}

export interface ClientEvent {
  date: string;
  text: string;
}

export interface ClientConversation {
  id: string;
  name: string;
  channel: ClientChannel;
  country: string;
  language: string;
  owner: string;
  funnel: FunnelCode;
  stage: string;
  programme: string;
  intake: string;
  source: string;
  next: string;
  sum: string;
  sla?: string;
  overdue?: boolean;
  /** What the assistant makes of the whole lead, in two sentences. */
  state: string;
  messages: ClientMessage[];
  tasks: ClientTask[];
  calls: ClientCall[];
  events: ClientEvent[];
}

export const funnelNames: Record<FunnelCode, string> = {
  BB: 'Bachelor in Business',
  MA: 'Masters & MBA',
};

export const clientConversations: ClientConversation[] = [
  {
    id: 'd-F1d',
    name: 'Marta Levchenko',
    channel: 'WhatsApp',
    country: 'UA',
    language: 'Ukrainian',
    owner: 'Oksana',
    funnel: 'MA',
    stage: 'New',
    programme: 'International MBA',
    intake: 'February 2027',
    source: 'WhatsApp',
    next: 'grant question · call',
    sum: '—',
    sla: '1:40',
    state:
      'Wants the International MBA from February and asks about a grant for Ukrainian students. Waiting for a call, the SLA runs out in 1:40.',
    messages: [
      {
        id: 'm1',
        direction: 'in',
        text: 'Hello! I am interested in the International MBA starting in February. Are there grants for students from Ukraine?',
        at: '10:12',
      },
      {
        id: 'm2',
        direction: 'in',
        text: 'And can I study online for the first semester while my visa is processed?',
        at: '10:13',
      },
    ],
    tasks: [
      { title: 'Call back about the grant', owner: 'Oksana', due: 'today', priority: 'high' },
    ],
    calls: [],
    events: [{ date: '15.10', text: 'ESEI grant application deadline' }],
  },
  {
    id: 'd-F1b',
    name: 'Bohdan S.',
    channel: 'TikTok',
    country: 'UA',
    language: 'Ukrainian',
    owner: 'Oksana',
    funnel: 'MA',
    stage: 'New',
    programme: 'MSc Digital Marketing',
    intake: '—',
    source: 'TikTok · comment',
    next: 'confirm the intake',
    sum: '—',
    state:
      'Came from a comment under a Digital Marketing video. Has not said which intake or whether he holds a bachelor degree.',
    messages: [
      {
        id: 'm1',
        direction: 'in',
        text: 'comment: "do you take people into digital marketing without experience?"',
        at: '10:48',
      },
      {
        id: 'm2',
        direction: 'out',
        text: 'Hi Bohdan! Yes, the MSc Digital Marketing works without experience. What degree do you have, and which intake are you looking at, October or February?',
        at: '10:51',
        by: 'Oksana',
      },
    ],
    tasks: [{ title: 'Confirm the degree and intake', owner: 'Oksana', due: '21.10' }],
    calls: [],
    events: [],
  },
  {
    id: 'd-F1a',
    name: 'Olha · masters form',
    channel: 'Website',
    country: 'UA',
    language: 'Ukrainian',
    owner: 'Natalia',
    funnel: 'MA',
    stage: 'Qualification',
    programme: 'Marketing and Communication',
    intake: 'October 2027',
    source: 'Masters landing',
    next: 'call back',
    sum: '—',
    state:
      'Filled in the masters landing form, comparing Marketing and Communication with Digital Marketing. Asked for a call in the evening.',
    messages: [
      {
        id: 'm1',
        direction: 'system',
        text: 'Landing form: Olha · Marketing and Communication · "please call after 18:00"',
        at: 'yesterday',
      },
      {
        id: 'm2',
        direction: 'out',
        text: 'Good evening, Olha! I will call you today at 18:30 to explain how the programmes differ.',
        at: 'yesterday',
        by: 'Natalia',
      },
    ],
    tasks: [{ title: 'Call at 18:30', owner: 'Natalia', due: 'today' }],
    calls: [],
    events: [],
  },
  {
    id: 'd-F1e',
    name: 'Taras Bondar',
    channel: 'Telegram',
    country: 'UA',
    language: 'Ukrainian',
    owner: 'Natalia',
    funnel: 'MA',
    stage: 'Qualification',
    programme: 'Business Management',
    intake: 'October 2027',
    source: 'Telegram',
    next: 'admission interview · 09.09',
    sum: '€ 9 800',
    state:
      'Ready to apply for Business Management, the interview is booked. Worried about his English, worth offering the test.',
    messages: [
      {
        id: 'm1',
        direction: 'in',
        text: 'Hi! Is the interview on the 9th still on? A bit nervous about my English 🙈',
        at: '09:40',
      },
      {
        id: 'm2',
        direction: 'out',
        text: 'Yes, 09.09 at 11:00 online. Before it you can take our free English test, I will send the link.',
        at: '09:44',
        by: 'Natalia',
      },
      { id: 'm3', direction: 'in', text: 'Great, thank you!', at: '09:45' },
    ],
    tasks: [{ title: 'Send the English test', owner: 'Natalia', due: '08.09' }],
    calls: [
      {
        at: '02.09',
        duration: '12 min',
        summary: 'Went through the programme and the merit scholarship',
        open: 'English level',
      },
    ],
    events: [{ date: '09.09', text: 'Admission interview · 11:00' }],
  },
  {
    id: 'd-F1c',
    name: 'Email · partner agency',
    channel: 'Email',
    country: 'PL',
    language: 'English',
    owner: 'Natalia',
    funnel: 'MA',
    stage: 'Offer',
    programme: 'Tourism and Hospitality',
    intake: 'October 2027',
    source: 'Email',
    next: 'offer sent 03.09',
    sum: '12 × € 9 800',
    state:
      'A Warsaw agency brings a group of 12 students for Tourism and Hospitality and asks for a discount. Offer sent, reply expected by 08.09.',
    messages: [
      {
        id: 'm1',
        direction: 'in',
        text: 'Hello! We have a group of 12 students interested in the Master in Tourism and Hospitality Management. Is there a group discount?',
        at: '01.09',
      },
      {
        id: 'm2',
        direction: 'out',
        text: 'Dear partners, thank you! Please find attached our group offer: 12 places at € 9 800 with a 10% group discount if confirmed by 8 September.',
        at: '03.09',
        by: 'Natalia',
      },
    ],
    tasks: [
      {
        title: 'Prepare the agency contract',
        owner: 'Natalia',
        due: '08.09',
        priority: 'high',
      },
    ],
    calls: [],
    events: [{ date: '08.09', text: 'Offer valid until' }],
  },
  {
    id: 'd-F1n',
    name: 'Daniel Ruiz',
    channel: 'LinkedIn',
    country: 'ES',
    language: 'Spanish',
    owner: 'Oksana',
    funnel: 'MA',
    stage: 'Offer',
    programme: 'International MBA',
    intake: 'October 2027',
    source: 'LinkedIn · alumni referral',
    next: 'send the offer · today 18:00',
    sum: '€ 14 200',
    state:
      'Alumni referral, works in Barcelona and wants the evening MBA. The offer has to go out today by 18:00.',
    messages: [
      {
        id: 'm1',
        direction: 'in',
        text: 'Hola, me recomendó Laura (promoción 2024). Trabajo a tiempo completo, ¿el International MBA tiene horario de tarde?',
        at: 'yesterday',
      },
      {
        id: 'm2',
        direction: 'out',
        text: '¡Hola Daniel! Sí, hay grupo de tarde, lunes a jueves 18:30–21:30. Hoy le envío la oferta con la beca de recomendación.',
        at: '11:20',
        by: 'Oksana',
      },
    ],
    tasks: [{ title: 'Send the MBA offer', owner: 'Oksana', due: 'today 18:00', priority: 'high' }],
    calls: [
      {
        at: 'yesterday',
        duration: '18 min',
        summary: 'Evening format, 10% referral scholarship',
      },
    ],
    events: [{ date: '25.10', text: 'MBA open day · Barcelona campus' }],
  },
  {
    id: 'd-F1f',
    name: 'Viktoriia S.',
    channel: 'Telegram',
    country: 'UA',
    language: 'Ukrainian',
    owner: 'Natalia',
    funnel: 'MA',
    stage: 'Payment',
    programme: 'International Relations',
    intake: 'October 2027',
    source: 'Telegram',
    next: 'invoice · awaiting payment',
    sum: '€ 9 800',
    sla: 'today',
    state:
      'Accepted the International Relations offer, invoice sent. Payment is due today, otherwise the place goes to the waiting list.',
    messages: [
      {
        id: 'm1',
        direction: 'out',
        text: 'Viktoriia, the deposit invoice is attached 📎',
        at: '07.09',
        by: 'Natalia',
      },
      { id: 'm2', direction: 'in', text: 'Thank you! My parents will pay tonight', at: '07.09' },
    ],
    tasks: [{ title: 'Check the deposit payment', owner: 'Natalia', due: 'today' }],
    calls: [],
    events: [{ date: 'today', text: 'Deposit payment deadline' }],
  },
  {
    id: 'd-F1g',
    name: 'Sofia B.',
    channel: 'WhatsApp',
    country: 'UA',
    language: 'Ukrainian',
    owner: 'Natalia',
    funnel: 'MA',
    stage: 'Won',
    programme: 'MSc Digital Marketing',
    intake: 'October 2027',
    source: 'WhatsApp',
    next: '→ student services · Oksana',
    sum: '€ 9 800',
    state:
      'Paid and enrolled on the MSc Digital Marketing. Handed over to student services, to Oksana.',
    messages: [
      {
        id: 'm1',
        direction: 'system',
        text: 'Handover from admissions · Natalia → Oksana (student services) · history kept',
        at: '05.09',
      },
      { id: 'm2', direction: 'in', text: 'When is orientation week?', at: '06.09' },
      {
        id: 'm3',
        direction: 'out',
        text: 'On 29 September, I will send the programme a week before 🙌',
        at: '06.09',
        by: 'Oksana',
      },
    ],
    tasks: [],
    calls: [],
    events: [{ date: '29.09', text: 'Orientation week' }],
  },
  {
    id: 'd-S8',
    name: 'Nataliia H.',
    channel: 'Messenger',
    country: 'UA',
    language: 'Ukrainian',
    owner: 'Natalia',
    funnel: 'BB',
    stage: 'New',
    programme: 'Bachelor in Business',
    intake: 'October 2027',
    source: 'Messenger',
    next: "parent's call · 14:00",
    sum: '—',
    sla: '0:12',
    state:
      "The applicant's mother writes, asking about housing for under-18s. A call is set for 14:00.",
    messages: [
      {
        id: 'm1',
        direction: 'in',
        text: 'Hello, my daughter is finishing school and is interested in the Bachelor in Business. Is there a residence for 17-year-olds?',
        at: '11:02',
      },
      {
        id: 'm2',
        direction: 'out',
        text: 'Hello! Yes, there is a supervised residence. Can I call you at 14:00?',
        at: '11:05',
        by: 'Natalia',
      },
      { id: 'm3', direction: 'in', text: 'Yes, 14:00 works', at: '11:06' },
    ],
    tasks: [
      {
        title: "Call the applicant's mother · 14:00",
        owner: 'Natalia',
        due: 'today',
        priority: 'high',
      },
    ],
    calls: [],
    events: [],
  },
  {
    id: 'd-S10',
    name: 'Website request · open day',
    channel: 'Website',
    country: 'ES',
    language: 'English',
    owner: 'Natalia',
    funnel: 'BB',
    stage: 'New',
    programme: 'Bachelor in Business',
    intake: '—',
    source: 'Open day landing',
    next: 'call back today',
    sum: '—',
    sla: '0:05',
    state: 'A request for the Barcelona campus open day. Needs a call back within 5 minutes.',
    messages: [
      {
        id: 'm1',
        direction: 'system',
        text: 'Open day form: 2 people · Saturday 26.10 · "please call me"',
        at: '10:55',
      },
    ],
    tasks: [
      { title: 'Call back about the request', owner: 'Natalia', due: 'now', priority: 'high' },
    ],
    calls: [],
    events: [{ date: '26.10', text: 'Open day · Barcelona campus' }],
  },
  {
    id: 'd-S4',
    name: 'Olena T.',
    channel: 'Telegram',
    country: 'UA',
    language: 'Ukrainian',
    owner: 'Natalia',
    funnel: 'BB',
    stage: 'Campus visit',
    programme: 'Bachelor in Business',
    intake: 'October 2027',
    source: 'Telegram',
    next: 'campus tour 09.09 13:00 · slot from LMS',
    sum: '€ 11 600 / year',
    state: 'Booked on the campus tour 09.09 at 13:00. Coming with her father.',
    messages: [
      { id: 'm1', direction: 'in', text: 'Can we come and see the campus?', at: '05.09' },
      {
        id: 'm2',
        direction: 'out',
        text: 'Of course! There is a place in the 09.09 13:00 group, shall I book it?',
        at: '05.09',
        by: 'Natalia',
      },
      { id: 'm3', direction: 'in', text: 'Yes, I will come with my dad', at: '05.09' },
    ],
    tasks: [],
    calls: [],
    events: [{ date: '09.09', text: 'Campus tour · 13:00' }],
  },
  {
    id: 'd-S5',
    name: 'Ihor D.',
    channel: 'WhatsApp',
    country: 'UA',
    language: 'Ukrainian',
    owner: 'Natalia',
    funnel: 'BB',
    stage: 'Campus visit',
    programme: 'Bachelor in Business',
    intake: 'October 2027',
    source: 'WhatsApp',
    next: 'missed the campus tour · win back 10.09',
    sum: '€ 11 600 / year',
    overdue: true,
    state: 'Missed the campus tour and does not reply. Worth offering an online tour.',
    messages: [
      {
        id: 'm1',
        direction: 'out',
        text: 'Ihor, we were expecting you on the tour today. Is everything all right?',
        at: '03.09',
        by: 'Natalia',
      },
      {
        id: 'm2',
        direction: 'out',
        text: 'We can do an online tour whenever suits you 🙂',
        at: '05.09',
        by: 'Natalia',
      },
    ],
    tasks: [{ title: 'Offer an online tour', owner: 'Natalia', due: '10.09' }],
    calls: [],
    events: [],
  },
  {
    id: 'd-S7',
    name: 'Amina El Mansouri',
    channel: 'WhatsApp',
    country: 'MA',
    language: 'English',
    owner: 'Oksana',
    funnel: 'BB',
    stage: 'Application',
    programme: 'Bachelor in Business',
    intake: 'October 2027',
    source: 'WhatsApp',
    next: 'application fee invoiced · 2 days',
    sum: '€ 11 600 / year',
    sla: '2 days',
    state:
      'Applied for the Bachelor in Business, the application fee is pending. Asked about translating her school certificate.',
    messages: [
      {
        id: 'm1',
        direction: 'in',
        text: 'Hi! I uploaded my documents. Do I need a sworn translation of my baccalaureate from French?',
        at: '06.09',
      },
      {
        id: 'm2',
        direction: 'out',
        text: 'Hi Amina! A French copy is fine for the application. The invoice for the application fee is attached.',
        at: '06.09',
        by: 'Oksana',
      },
    ],
    tasks: [{ title: 'Check the application fee', owner: 'Oksana', due: '08.09' }],
    calls: [],
    events: [],
  },
  {
    id: 'd-S1',
    name: 'Sofia Martins',
    channel: 'Instagram',
    country: 'PT',
    language: 'English',
    owner: 'Oksana',
    funnel: 'BB',
    stage: 'Deposit',
    programme: 'Bachelor in Business',
    intake: 'October 2027',
    source: 'Instagram',
    next: 'deposit received · enrolment pack 15.09',
    sum: '€ 11 600 / year',
    state:
      'Deposit received, waiting for the enrolment pack. Visited the campus, compared it with other Barcelona schools.',
    messages: [
      {
        id: 'm1',
        direction: 'in',
        text: 'Deposit sent! When will I get the enrolment pack?',
        at: '11:02',
      },
      {
        id: 'm2',
        direction: 'out',
        text: 'Received, thank you Sofia! The pack comes on 15 September with your schedule.',
        at: '11:06',
        by: 'Oksana',
      },
    ],
    tasks: [{ title: 'Send the enrolment pack', owner: 'Oksana', due: '15.09' }],
    calls: [],
    events: [{ date: '15.09', text: 'Enrolment pack' }],
  },
  {
    id: 'd-S2',
    name: 'Alina T.',
    channel: 'Telegram',
    country: 'UA',
    language: 'Ukrainian',
    owner: 'Oksana',
    funnel: 'BB',
    stage: 'Deposit',
    programme: 'Bachelor in Business',
    intake: 'October 2027',
    source: 'Telegram',
    next: 'deposit missing · call',
    sum: '€ 11 600 / year',
    overdue: true,
    state: 'The deposit is 4 days overdue. Promised to call back after 18:00.',
    messages: [
      {
        id: 'm1',
        direction: 'out',
        text: 'Alina, a reminder about the deposit, it was due on 04.09',
        at: 'yesterday',
        by: 'Oksana',
      },
      { id: 'm2', direction: 'in', text: 'I will call back after 18:00', at: 'yesterday' },
    ],
    tasks: [{ title: 'Call about the deposit', owner: 'Oksana', due: 'today', priority: 'high' }],
    calls: [],
    events: [],
  },
  {
    id: 'd-S6',
    name: 'Denys Sh.',
    channel: 'Instagram',
    country: 'UA',
    language: 'Ukrainian',
    owner: 'Oksana',
    funnel: 'BB',
    stage: 'Deposit',
    programme: 'Bachelor in Business',
    intake: 'October 2027',
    source: 'Instagram',
    next: '→ student services · handed over',
    sum: '€ 11 600 / year',
    state: 'Deposit paid, handed over to student services for the visa letter.',
    messages: [
      {
        id: 'm1',
        direction: 'system',
        text: 'Handover from admissions · Natalia → Oksana (student services)',
        at: '01.09',
      },
      { id: 'm2', direction: 'in', text: 'When will the visa letter be ready?', at: '02.09' },
    ],
    tasks: [{ title: 'Visa letter', owner: 'Oksana', due: '12.09' }],
    calls: [],
    events: [],
  },
  {
    id: 'd-S9',
    name: 'Yuliia P.',
    channel: 'Instagram',
    country: 'UA',
    language: 'Ukrainian',
    owner: 'Oksana',
    funnel: 'BB',
    stage: 'Deposit',
    programme: 'Bachelor in Business',
    intake: 'October 2027',
    source: 'Instagram',
    next: 'deposit 1 600 outstanding · remind',
    sum: '€ 11 600 / year',
    overdue: true,
    state:
      'Paid part of the deposit, € 1 600 is missing. The assistant suggests offering an instalment plan.',
    messages: [
      {
        id: 'm1',
        direction: 'in',
        text: 'Can I pay the rest of the deposit next month?',
        at: '04.09',
      },
    ],
    tasks: [{ title: 'Offer an instalment plan', owner: 'Oksana', due: 'today' }],
    calls: [],
    events: [],
  },
  {
    id: 'd-S3',
    name: 'Lucas Moreau',
    channel: 'Instagram',
    country: 'FR',
    language: 'English',
    owner: 'Oksana',
    funnel: 'BB',
    stage: 'Enrolled',
    programme: 'Bachelor in Business',
    intake: 'October 2027',
    source: 'Instagram',
    next: 'welcome call at 14:30',
    sum: '€ 11 600 / year',
    state: 'Enrolled. Welcome call today at 14:30.',
    messages: [
      {
        id: 'm1',
        direction: 'out',
        text: 'Welcome to ESEI, Lucas! Shall we have a quick welcome call at 14:30?',
        at: '09:30',
        by: 'Oksana',
      },
      { id: 'm2', direction: 'in', text: 'Perfect, talk then!', at: '09:41' },
    ],
    tasks: [],
    calls: [],
    events: [{ date: '29.09', text: 'Orientation week' }],
  },
  {
    id: 'd-S11',
    name: 'Artem R.',
    channel: 'WhatsApp',
    country: 'UA',
    language: 'Ukrainian',
    owner: 'Oksana',
    funnel: 'BB',
    stage: 'Enrolled',
    programme: 'Bachelor in Business',
    intake: 'October 2027',
    source: 'WhatsApp',
    next: 'visa letter by 30.09',
    sum: '€ 11 600 / year',
    state: 'Enrolled, waiting for the visa letter by 30.09.',
    messages: [
      { id: 'm1', direction: 'in', text: 'Thank you, waiting for the visa letter 🙏', at: '02.09' },
    ],
    tasks: [{ title: 'Visa letter', owner: 'Oksana', due: '30.09' }],
    calls: [],
    events: [{ date: '30.09', text: 'Visa letter' }],
  },
];

/** The conversation is waiting on the team when the client wrote last. */
export function isAwaitingReply(conversation: ClientConversation): boolean {
  const last = conversation.messages
    .filter((message) => message.direction !== 'note' && message.direction !== 'assistant')
    .at(-1);
  return last?.direction === 'in' || last?.direction === 'system';
}

export function findClientConversation(id: string | undefined): ClientConversation | undefined {
  return clientConversations.find((conversation) => conversation.id === id);
}
