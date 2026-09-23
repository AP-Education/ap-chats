# Архітектура Connect

## Що взяли із сусідніх проєктів

- `backend-LMS`: NestJS-модулі за доменами; централізовані конфігурація, логування й OIDC Accounts. У `src/components/accounts/protocol/accounts-provider.factory.ts` поки зареєстрований лише `accounts-dev-client`. `extraTokenClaims` передає `appId`. Потрібен окремий client/audience Connect і контракт ідентичності користувача до інтеграції.
- `front-LMS`: композиція `QueryClientProvider → ThemeProvider → router`, `MainLayout` із header/sidebar/content, вкладені маршрути, Ant Design 6 та зелений акцент `#0c7d77`. Тут залишений цей каркас без MembershipProvider, LMS drawer-ів і великої FSD-ієрархії.
- `ai-native`: бек і веб поруч у одному репозиторії, доменні модулі, Fastify та перевірка `iss`/`aud` токена. Його нинішній прямий LMS login — тимчасовий механізм, не контракт для Connect.

Зараз `src/globals/config` та `src/globals/logger` — **локально адаптовані копії патернів backend-LMS**. Це свідоме дублювання: окремий shared-пакет потребував би власних версій, сумісності й супроводу. Копія містить тільки потрібні Connect поля; зміни в LMS не переносяться автоматично. Раз на реліз порівнюємо потрібні правила конфігурації, request ID та редагування секретів у логах.

## Межі системи

```text
AP Accounts (OIDC) ──> Connect API ──> Postgres: канали, членство, повідомлення, виклики
                          │              Redis: presence, fan-out, тимчасові задачі
Web / Mobile WebView ────┤
                          ├───────────> LiveKit: аудіо/відео, без історії чату
                          └───────────> Push provider: сповіщення пристроїв
```

API — власник правил чату й gateway до Accounts/LiveKit/push. Він не є тільки проксі. `backend-LMS` не має залежати від Connect. Між продуктами спільний лише стабільний subject OIDC, а профіль та доступ до простору Connect треба визначити явно. Локальна БД Connect окрема від LMS.

### Принципи для реалізації

1. Спочатку один Nest процес і одна Postgres БД. Модулі `identity`, `chat`, `calls`, `notifications` додаємо разом із працюючими use cases. Немає окремих мікросервісів або Kubernetes.
2. Postgres — джерело істини для повідомлень і членства. В межах транзакції записуємо повідомлення та outbox-подію; після commit доставляємо realtime і push. Клієнт після reconnect дочитує історію за cursor/sequence, а не покладається на WebSocket як сховище.
3. Кожне читання/запис повідомлень, видача LiveKit token і підписка на realtime перевіряють членство на сервері. API валідовує OIDC `iss`, `aud`, підпис JWKS та Connect `appId`/tenant-контекст, коли їхній контракт буде погоджено. LiveKit secret залишається лише на сервері.
4. У вебі `app/providers`, `app/layouts`, `app/router` та `pages` покривають поточний обсяг. Папки `features`/`entities` з'являться лише коли код дійсно потребуватиме окремої межі. Публічні маршрути й auth boundary визначимо після Accounts spike.
5. Мобільний WebView отримує віддалену HTTPS-сторінку. Native bridge має вузький контракт: реєстрація push token, відкриття deep link, відповідь на дзвінок. Не передаємо OIDC або LiveKit secret через bridge. Нативний дзвінок перевіряємо на реальних iOS/Android пристроях до обіцянки повноцінного call UX.

## Масштабування без передчасної інфраструктури

Перший production deployment: один API, статичний веб, Postgres, Redis і керований або окремо розгорнутий LiveKit. Якщо зросте трафік, API можна реплікувати після винесення presence/fan-out у Redis та перевірки ідемпотентності outbox worker. Пошук починається з Postgres full-text; окремий індекс потрібен тільки за виміряної потреби. Файли — object storage з підписаними URL, коли attachments увійдуть до MVP.

Окремі релізи: `api-vX.Y.Z`, `web-vX.Y.Z`, `mobile-vX.Y.Z`. Backend змінює API з backward-compatible контрактом; веб може деплоїтись частіше, mobile binary — окремо з власними credentials та перевіркою сумісності bridge. Спільний lockfile змушує усі три CI workflow перевіряти кореневі зміни; зміни всередині `src/`, `web/` і `mobile/` запускають тільки відповідну перевірку. Deployment workflow додамо разом із реальним оточенням, не зараз.
