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
    language: 'українська',
    owner: 'Оксана',
    funnel: 'MA',
    stage: 'New',
    programme: 'International MBA',
    intake: 'February 2027',
    source: 'WhatsApp',
    next: 'grant question · call',
    sum: '—',
    sla: '1:40',
    state:
      'Хоче International MBA з лютого і питає про грант для українських студентів. Чекає дзвінка, SLA спливає за 1:40.',
    messages: [
      {
        id: 'm1',
        direction: 'in',
        text: 'Добрий день! Цікавить International MBA з лютого. Чи є гранти для студентів з України?',
        at: '10:12',
      },
      {
        id: 'm2',
        direction: 'in',
        text: 'І чи можна вчитися онлайн перший семестр, поки оформлюю візу?',
        at: '10:13',
      },
    ],
    tasks: [
      { title: 'Передзвонити щодо гранту', owner: 'Оксана', due: 'сьогодні', priority: 'high' },
    ],
    calls: [],
    events: [{ date: '15.10', text: 'Дедлайн подачі на грант ESEI' }],
  },
  {
    id: 'd-F1b',
    name: 'Bohdan S.',
    channel: 'TikTok',
    country: 'UA',
    language: 'українська',
    owner: 'Оксана',
    funnel: 'MA',
    stage: 'New',
    programme: 'MSc Digital Marketing',
    intake: '—',
    source: 'TikTok · comment',
    next: 'confirm the intake',
    sum: '—',
    state:
      'Прийшов з коментаря під відео про Digital Marketing. Ще не сказав, на який набір і чи є бакалаврський диплом.',
    messages: [
      {
        id: 'm1',
        direction: 'in',
        text: 'коментар: «а на digital marketing без досвіду беруть?»',
        at: '10:48',
      },
      {
        id: 'm2',
        direction: 'out',
        text: 'Вітаю, Богдане! Так, MSc Digital Marketing підходить і без досвіду. Який у вас диплом і на який набір дивитесь — жовтень чи лютий?',
        at: '10:51',
        by: 'Оксана',
      },
    ],
    tasks: [{ title: 'Уточнити диплом і набір', owner: 'Оксана', due: '21.10' }],
    calls: [],
    events: [],
  },
  {
    id: 'd-F1a',
    name: 'Olha · masters form',
    channel: 'Website',
    country: 'UA',
    language: 'українська',
    owner: 'Наталя',
    funnel: 'MA',
    stage: 'Qualification',
    programme: 'Marketing and Communication',
    intake: 'October 2027',
    source: 'Masters landing',
    next: 'call back',
    sum: '—',
    state:
      'Залишила форму на лендингу магістратури, порівнює Marketing and Communication з Digital Marketing. Просила передзвонити ввечері.',
    messages: [
      {
        id: 'm1',
        direction: 'system',
        text: 'Форма з лендингу: Olha · Marketing and Communication · «передзвоніть після 18:00»',
        at: 'вчора',
      },
      {
        id: 'm2',
        direction: 'out',
        text: 'Добрий вечір, Ольго! Наберу вас сьогодні о 18:30 — розкажу різницю між програмами.',
        at: 'вчора',
        by: 'Наталя',
      },
    ],
    tasks: [{ title: 'Дзвінок о 18:30', owner: 'Наталя', due: 'сьогодні' }],
    calls: [],
    events: [],
  },
  {
    id: 'd-F1e',
    name: 'Taras Bondar',
    channel: 'Telegram',
    country: 'UA',
    language: 'українська',
    owner: 'Наталя',
    funnel: 'MA',
    stage: 'Qualification',
    programme: 'Business Management',
    intake: 'October 2027',
    source: 'Telegram',
    next: 'admission interview · 09.09',
    sum: '€ 9 800',
    state:
      'Готовий вступати на Business Management, співбесіда призначена. Хвилюється за рівень англійської — варто запропонувати тест.',
    messages: [
      {
        id: 'm1',
        direction: 'in',
        text: 'Привіт! Співбесіда 9-го в силі? Трохи хвилююсь за англійську 🙈',
        at: '09:40',
      },
      {
        id: 'm2',
        direction: 'out',
        text: 'Так, 9.09 о 11:00 онлайн. Перед нею можете пройти наш безкоштовний тест англійської — надішлю посилання.',
        at: '09:44',
        by: 'Наталя',
      },
      { id: 'm3', direction: 'in', text: 'Супер, дякую!', at: '09:45' },
    ],
    tasks: [{ title: 'Надіслати тест англійської', owner: 'Наталя', due: '08.09' }],
    calls: [
      {
        at: '02.09',
        duration: '12 хв',
        summary: 'Обговорили програму і стипендію за успішність',
        open: 'рівень англійської',
      },
    ],
    events: [{ date: '09.09', text: 'Співбесіда на вступ · 11:00' }],
  },
  {
    id: 'd-F1c',
    name: 'Email · partner agency',
    channel: 'Email',
    country: 'PL',
    language: 'English',
    owner: 'Наталя',
    funnel: 'MA',
    stage: 'Offer',
    programme: 'Tourism and Hospitality',
    intake: 'October 2027',
    source: 'Email',
    next: 'offer sent 03.09',
    sum: '12 × € 9 800',
    state:
      'Агенція з Варшави везе групу з 12 студентів на Tourism and Hospitality і питає про знижку. Оффер надіслано, чекаємо відповіді до 08.09.',
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
        by: 'Наталя',
      },
    ],
    tasks: [
      {
        title: 'Підготувати договір з агенцією',
        owner: 'Наталя',
        due: '08.09',
        priority: 'high',
      },
    ],
    calls: [],
    events: [{ date: '08.09', text: 'Оффер діє до' }],
  },
  {
    id: 'd-F1n',
    name: 'Daniel Ruiz',
    channel: 'LinkedIn',
    country: 'ES',
    language: 'español',
    owner: 'Оксана',
    funnel: 'MA',
    stage: 'Offer',
    programme: 'International MBA',
    intake: 'October 2027',
    source: 'LinkedIn · alumni referral',
    next: 'send the offer · today 18:00',
    sum: '€ 14 200',
    state:
      'Рекомендація випускника, працює в Барселоні й хоче вечірній формат MBA. Оффер треба надіслати сьогодні до 18:00.',
    messages: [
      {
        id: 'm1',
        direction: 'in',
        text: 'Hola, me recomendó Laura (promoción 2024). Trabajo a tiempo completo, ¿el International MBA tiene horario de tarde?',
        at: 'вчора',
      },
      {
        id: 'm2',
        direction: 'out',
        text: '¡Hola Daniel! Sí, hay grupo de tarde, lunes a jueves 18:30–21:30. Hoy le envío la oferta con la beca de recomendación.',
        at: '11:20',
        by: 'Оксана',
      },
    ],
    tasks: [
      { title: 'Надіслати оффер MBA', owner: 'Оксана', due: 'сьогодні 18:00', priority: 'high' },
    ],
    calls: [
      {
        at: 'вчора',
        duration: '18 хв',
        summary: 'Вечірній формат, стипендія за рекомендацію 10%',
      },
    ],
    events: [{ date: '25.10', text: 'Open day MBA · кампус Барселона' }],
  },
  {
    id: 'd-F1f',
    name: 'Viktoriia S.',
    channel: 'Telegram',
    country: 'UA',
    language: 'українська',
    owner: 'Наталя',
    funnel: 'MA',
    stage: 'Payment',
    programme: 'International Relations',
    intake: 'October 2027',
    source: 'Telegram',
    next: 'invoice · awaiting payment',
    sum: '€ 9 800',
    sla: 'today',
    state:
      'Прийняла оффер на International Relations, рахунок виставлено. Оплата має прийти сьогодні, інакше місце піде в резерв.',
    messages: [
      {
        id: 'm1',
        direction: 'out',
        text: 'Вікторіє, рахунок на депозит у вкладенні 📎',
        at: '07.09',
        by: 'Наталя',
      },
      { id: 'm2', direction: 'in', text: 'Дякую! Батьки оплатять сьогодні ввечері', at: '07.09' },
    ],
    tasks: [{ title: 'Перевірити оплату депозиту', owner: 'Наталя', due: 'сьогодні' }],
    calls: [],
    events: [{ date: 'сьогодні', text: 'Кінцевий термін оплати депозиту' }],
  },
  {
    id: 'd-F1g',
    name: 'Sofia B.',
    channel: 'WhatsApp',
    country: 'UA',
    language: 'українська',
    owner: 'Наталя',
    funnel: 'MA',
    stage: 'Won',
    programme: 'MSc Digital Marketing',
    intake: 'October 2027',
    source: 'WhatsApp',
    next: '→ student services · Oksana',
    sum: '€ 9 800',
    state: 'Оплатила і зарахована на MSc Digital Marketing. Передана в student services до Оксани.',
    messages: [
      {
        id: 'm1',
        direction: 'system',
        text: 'Передача від продажу · Наталя → Оксана (student services) · історія збережена',
        at: '05.09',
      },
      { id: 'm2', direction: 'in', text: 'Коли буде orientation week?', at: '06.09' },
      {
        id: 'm3',
        direction: 'out',
        text: '29 вересня, програму надішлю за тиждень 🙌',
        at: '06.09',
        by: 'Оксана',
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
    language: 'українська',
    owner: 'Наталя',
    funnel: 'BB',
    stage: 'New',
    programme: 'Bachelor in Business',
    intake: 'October 2027',
    source: 'Messenger',
    next: "parent's call · 14:00",
    sum: '—',
    sla: '0:12',
    state:
      'Пише мама абітурієнтки, питає про проживання для неповнолітніх. Домовились про дзвінок о 14:00.',
    messages: [
      {
        id: 'm1',
        direction: 'in',
        text: 'Доброго дня, донька закінчує школу, цікавить Bachelor in Business. Чи є гуртожиток для 17-річних?',
        at: '11:02',
      },
      {
        id: 'm2',
        direction: 'out',
        text: 'Доброго дня! Так, є резиденція з наглядом. Можу набрати о 14:00?',
        at: '11:05',
        by: 'Наталя',
      },
      { id: 'm3', direction: 'in', text: 'Так, о 14:00 зручно', at: '11:06' },
    ],
    tasks: [{ title: 'Дзвінок мамі · 14:00', owner: 'Наталя', due: 'сьогодні', priority: 'high' }],
    calls: [],
    events: [],
  },
  {
    id: 'd-S10',
    name: 'Website request · open day',
    channel: 'Website',
    country: 'ES',
    language: 'English',
    owner: 'Наталя',
    funnel: 'BB',
    stage: 'New',
    programme: 'Bachelor in Business',
    intake: '—',
    source: 'Open day landing',
    next: 'call back today',
    sum: '—',
    sla: '0:05',
    state:
      'Заявка на день відкритих дверей кампусу в Барселоні. Треба передзвонити протягом 5 хвилин.',
    messages: [
      {
        id: 'm1',
        direction: 'system',
        text: 'Open day form: 2 people · Saturday 26.10 · "please call me"',
        at: '10:55',
      },
    ],
    tasks: [{ title: 'Передзвонити по заявці', owner: 'Наталя', due: 'зараз', priority: 'high' }],
    calls: [],
    events: [{ date: '26.10', text: 'Open day · кампус Барселона' }],
  },
  {
    id: 'd-S4',
    name: 'Olena T.',
    channel: 'Telegram',
    country: 'UA',
    language: 'українська',
    owner: 'Наталя',
    funnel: 'BB',
    stage: 'Campus visit',
    programme: 'Bachelor in Business',
    intake: 'October 2027',
    source: 'Telegram',
    next: 'campus tour 09.09 13:00 · slot from LMS',
    sum: '€ 11 600 / year',
    state: 'Записана на екскурсію кампусом 09.09 о 13:00. Приїде з батьком.',
    messages: [
      { id: 'm1', direction: 'in', text: 'Можна приїхати подивитись кампус?', at: '05.09' },
      {
        id: 'm2',
        direction: 'out',
        text: 'Звісно! 9.09 о 13:00 є місце в групі — записую?',
        at: '05.09',
        by: 'Наталя',
      },
      { id: 'm3', direction: 'in', text: 'Так, будемо з татом', at: '05.09' },
    ],
    tasks: [],
    calls: [],
    events: [{ date: '09.09', text: 'Екскурсія кампусом · 13:00' }],
  },
  {
    id: 'd-S5',
    name: 'Ihor D.',
    channel: 'WhatsApp',
    country: 'UA',
    language: 'українська',
    owner: 'Наталя',
    funnel: 'BB',
    stage: 'Campus visit',
    programme: 'Bachelor in Business',
    intake: 'October 2027',
    source: 'WhatsApp',
    next: 'missed the campus tour · win back 10.09',
    sum: '€ 11 600 / year',
    overdue: true,
    state: 'Не прийшов на екскурсію і не відповідає. Варто запропонувати онлайн-тур.',
    messages: [
      {
        id: 'm1',
        direction: 'out',
        text: 'Ігорю, чекали вас сьогодні на екскурсії. Все добре?',
        at: '03.09',
        by: 'Наталя',
      },
      {
        id: 'm2',
        direction: 'out',
        text: 'Можемо провести онлайн-тур у зручний час 🙂',
        at: '05.09',
        by: 'Наталя',
      },
    ],
    tasks: [{ title: 'Запропонувати онлайн-тур', owner: 'Наталя', due: '10.09' }],
    calls: [],
    events: [],
  },
  {
    id: 'd-S7',
    name: 'Amina El Mansouri',
    channel: 'WhatsApp',
    country: 'MA',
    language: 'English',
    owner: 'Оксана',
    funnel: 'BB',
    stage: 'Application',
    programme: 'Bachelor in Business',
    intake: 'October 2027',
    source: 'WhatsApp',
    next: 'application fee invoiced · 2 days',
    sum: '€ 11 600 / year',
    sla: '2 days',
    state:
      'Подала документи на Bachelor in Business, чекаємо внесок за заявку. Питала про переклад атестату.',
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
        by: 'Оксана',
      },
    ],
    tasks: [{ title: 'Перевірити внесок за заявку', owner: 'Оксана', due: '08.09' }],
    calls: [],
    events: [],
  },
  {
    id: 'd-S1',
    name: 'Sofia Martins',
    channel: 'Instagram',
    country: 'PT',
    language: 'English',
    owner: 'Оксана',
    funnel: 'BB',
    stage: 'Deposit',
    programme: 'Bachelor in Business',
    intake: 'October 2027',
    source: 'Instagram',
    next: 'deposit received · enrolment pack 15.09',
    sum: '€ 11 600 / year',
    state:
      'Депозит отримано, чекає пакет для зарахування. Відвідала кампус, порівнювала з іншими школами Барселони.',
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
        by: 'Оксана',
      },
    ],
    tasks: [{ title: 'Надіслати пакет для зарахування', owner: 'Оксана', due: '15.09' }],
    calls: [],
    events: [{ date: '15.09', text: 'Enrolment pack' }],
  },
  {
    id: 'd-S2',
    name: 'Alina T.',
    channel: 'Telegram',
    country: 'UA',
    language: 'українська',
    owner: 'Оксана',
    funnel: 'BB',
    stage: 'Deposit',
    programme: 'Bachelor in Business',
    intake: 'October 2027',
    source: 'Telegram',
    next: 'deposit missing · call',
    sum: '€ 11 600 / year',
    overdue: true,
    state: 'Депозит прострочено на 4 дні. Обіцяла передзвонити після 18:00.',
    messages: [
      {
        id: 'm1',
        direction: 'out',
        text: 'Аліно, нагадую про депозит — термін минув 4.09',
        at: 'вчора',
        by: 'Оксана',
      },
      { id: 'm2', direction: 'in', text: 'Передзвоню після 18:00', at: 'вчора' },
    ],
    tasks: [{ title: 'Дзвінок щодо депозиту', owner: 'Оксана', due: 'сьогодні', priority: 'high' }],
    calls: [],
    events: [],
  },
  {
    id: 'd-S6',
    name: 'Denys Sh.',
    channel: 'Instagram',
    country: 'UA',
    language: 'українська',
    owner: 'Оксана',
    funnel: 'BB',
    stage: 'Deposit',
    programme: 'Bachelor in Business',
    intake: 'October 2027',
    source: 'Instagram',
    next: '→ student services · handed over',
    sum: '€ 11 600 / year',
    state: 'Депозит сплачено, передано в student services для візового листа.',
    messages: [
      {
        id: 'm1',
        direction: 'system',
        text: 'Передача від продажу · Наталя → Оксана (student services)',
        at: '01.09',
      },
      { id: 'm2', direction: 'in', text: 'Коли буде лист для візи?', at: '02.09' },
    ],
    tasks: [{ title: 'Візовий лист', owner: 'Оксана', due: '12.09' }],
    calls: [],
    events: [],
  },
  {
    id: 'd-S9',
    name: 'Yuliia P.',
    channel: 'Instagram',
    country: 'UA',
    language: 'українська',
    owner: 'Оксана',
    funnel: 'BB',
    stage: 'Deposit',
    programme: 'Bachelor in Business',
    intake: 'October 2027',
    source: 'Instagram',
    next: 'deposit 1 600 outstanding · remind',
    sum: '€ 11 600 / year',
    overdue: true,
    state: 'Сплатила частину депозиту, бракує € 1 600. Асистент радить запропонувати розстрочку.',
    messages: [
      {
        id: 'm1',
        direction: 'in',
        text: 'Можна доплатити решту депозиту наступного місяця?',
        at: '04.09',
      },
    ],
    tasks: [{ title: 'Запропонувати розстрочку', owner: 'Оксана', due: 'сьогодні' }],
    calls: [],
    events: [],
  },
  {
    id: 'd-S3',
    name: 'Lucas Moreau',
    channel: 'Instagram',
    country: 'FR',
    language: 'English',
    owner: 'Оксана',
    funnel: 'BB',
    stage: 'Enrolled',
    programme: 'Bachelor in Business',
    intake: 'October 2027',
    source: 'Instagram',
    next: 'welcome call at 14:30',
    sum: '€ 11 600 / year',
    state: 'Зарахований. Вітальний дзвінок сьогодні о 14:30.',
    messages: [
      {
        id: 'm1',
        direction: 'out',
        text: 'Welcome to ESEI, Lucas! Shall we have a quick welcome call at 14:30?',
        at: '09:30',
        by: 'Оксана',
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
    language: 'українська',
    owner: 'Оксана',
    funnel: 'BB',
    stage: 'Enrolled',
    programme: 'Bachelor in Business',
    intake: 'October 2027',
    source: 'WhatsApp',
    next: 'visa letter by 30.09',
    sum: '€ 11 600 / year',
    state: 'Зарахований, чекає візовий лист до 30.09.',
    messages: [{ id: 'm1', direction: 'in', text: 'Дякую, чекаю лист для візи 🙏', at: '02.09' }],
    tasks: [{ title: 'Візовий лист', owner: 'Оксана', due: '30.09' }],
    calls: [],
    events: [{ date: '30.09', text: 'Візовий лист' }],
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
