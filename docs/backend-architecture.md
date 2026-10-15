# Бекенд: модулі, залежності, транзакції

Правила, за якими складено `src/components`. Приклади нижче взято з `social`, `calls` і `direct-messages`.

## Модулі

- **Батьківська тека це bounded context** (`social`, `calls`, `direct-messages`). Її кореневий модуль лише імпортує сабмодулі, наприклад `SocialModule`, `CallsModule`.
- **Сабмодуль це тека з власним Nest-модулем.** Якщо головному сабмодулю потрібна назва контексту, тека дублюється: `calls/calls` (`LiveCallsModule`) поруч із `calls/history`.
- **Barrel контексту** (`social/index.ts`) експортує лише свій модуль. Barrel сабмодуля експортує модуль і те, що в його `exports`. Типи, DTO та події імпортуються прямим шляхом: `@/components/social/messages/types/message.types`.
- **Інфраструктура стоїть за abstract class**, а не за interface із `Symbol` та `@Inject`: `MessagesRepository`, `StorageProvider`, `EventPublisher`, `RealtimePublisher`.
- **Загальні модулі не знають про своїх споживачів.** `uploads/storage`, `globals/realtime`, `globals/publisher` і схема БД не імпортують нічого з компонентів. Кімнати, payload і типи належать компоненту, який їх використовує.

## Атоми й молекули

Атом володіє одним поняттям і його таблицею. Молекула (use case, фасад, медіатор) складає атоми у бізнесовий сценарій. Граф лінійний, без циклів.

```
social
  entries, content, mentions        атоми без залежностей у social
  messages      → entries, mentions єдиний власник повідомлення: requireLive, nonce, автор, видалення
  attachments   → messages          життєвий цикл upload (uploading → ready → attached)
  pins, reactions, read-state → messages
  posting       → messages, attachments, pins   send / edit / delete, кожен окремим use case
  scheduling    → posting                       відкладений send: тримає запит до часу, тоді проводить його через posting
  forwarding    → messages, direct-messages/conversations
  history       → read-state        read model таймлайну
  realtime                          протокол сокетів social в одному relay
calls/calls     → social/entries, social/realtime
```

- **Правило живе в одному місці.** «Повідомлення живе» перевіряє лише `MessagesService.requireLive`; «хто модерує канал» визначає лише `ChannelAccessFacade.moderates`. Репозиторії в межах свого контексту можуть читати чужі таблиці для проєкцій (історія, pins), але не перевіряти бізнес-правила.
- **Delivery не має логіки.** Контролер чи gateway визначає, хто викликає, і передає виклик сервісу. Валідація полів належить DTO. Gateway лише доставляє вже вирішене.
- **Понад 4 залежності в конструкторі потребують обґрунтування**, інакше клас треба розкласти.

## Транзакції та події

Транзакція охоплює всю бізнесову зміну разом із її перевірками. Зовнішні ефекти (сокети, S3, HTTP до медіасервера) виконуються після commit.

```ts
async send(author, channelId, request) {
  const draft = await this.composer.draft(request); // до блокувань

  const { message, announce } = await this.post(author, channelId, draft);
  announce(); // після commit

  return message;
}

@Transactional()
private async post(author, channelId, draft) {
  // ...перевірки та запис
  const announce = await this.events.record(MESSAGE_CREATED_EVENT, event, { durable: true });
  return { message, announce };
}
```

- `EventPublisher.record` працює всередині транзакції й повертає `announce`. З `{ durable: true }` подія ще й пишеться в outbox у тій самій транзакції, тому push її отримає навіть після падіння процесу.
- `EventPublisher.publish` відмовляється працювати всередині транзакції: listener ніколи не успадкує її через CLS.
- Use case, викликаний усередині чужої транзакції, приєднується до неї (`DirectConversationsService.findOrCreate` у forward).

## Тести

- Тести перевіряють бізнес-правила й регресії, а не проводку: `posting.integration.spec.ts`, `transactional-event-publisher.integration.spec.ts`.
- Specs запускаються через tsx без decorator metadata, тому Nest DI там недоступний. Сервіси складаються один раз у `src/testing/*` (`socialServices`, `directMessageServices`) поверх PGlite з усіма міграціями.
- Повний застосунок із реальним DI перевіряє `pnpm test:uploads:integration` (потрібен `infra/docker-compose.uploads-test.yml`).
