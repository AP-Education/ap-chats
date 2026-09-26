# AP Chats

AP Chats — місце для щоденного спілкування команди AP замість Discord. Тут мають бути канали, особисті повідомлення й дзвінки зі входом через спільний AP-акаунт. Перша версія має покрити щоденні розмови, а не повторити весь Slack.

Зараз це **scaffold**: працюють API health check, вебоболонка з навігацією, мобільний WebView і базове підключення до AP Accounts через OIDC. Чати, дзвінки й push-повідомлення ще не реалізовані.

## Структура

```text
src/       NestJS API
web/       React, Vite, Ant Design; сторінки й layout
mobile/    Expo-оболонка для веба
infra/     локальний Postgres
```

Корінь — backend-пакет; `web` і `mobile` — окремі пакети в одному pnpm workspace. У них окремі перевірки й майбутні релізи, але спільний lockfile. Конфігурація та логування API локально адаптовані з `backend-LMS`: це свідоме дублювання, не shared-пакет.

## Локальний запуск

Потрібні Node 24 LTS і pnpm 11.17.0, а також Docker — API мігрує БД і не підніметься без локального Postgres.

```bash
cp .env.example .env
cp web/.env.example web/.env
cp mobile/.env.example mobile/.env
corepack enable
pnpm install --frozen-lockfile
pnpm infra:up           # локальний Postgres
pnpm dev                # API: http://localhost:3211/api/health/live
pnpm dev:web            # Web: http://localhost:5555
pnpm --filter @ap-chats/mobile start
```

На телефоні `localhost` — це сам телефон, тому в `mobile/.env` потрібна адреса веба, доступна з пристрою. У production веб має відкриватися через HTTPS.

## Спільний вхід

У `backend-LMS` потрібно зареєструвати окремий публічний OIDC-клієнт Chats з `application_id`, authorization code + PKCE, redirect URI `http://localhost:5555/auth/callback` і дозволити web origin у CORS. У кореневому `.env` задайте `OIDC_ISSUER` (точний issuer Accounts) та `OIDC_AUDIENCE` (resource audience цього API); у `web/.env` — ті самі issuer й audience та виданий `VITE_OIDC_CLIENT_ID`. Для production використовуйте HTTPS і відповідні production URI. Секрет клієнта у вебі не потрібний і зберігати його там не можна.

Web запитує access token для цього resource; API перевіряє підпис за JWKS Accounts, issuer, audience, час дії та identity. `GET /api/auth/me` повертає лише перевірені `sub` і `appId`, не повний профіль LMS. Без реєстрації Chats-клієнта в Accounts браузерний вхід не запрацює. Кнопка «Вийти з Chats» поки очищає тільки локальну сесію; logout в Accounts — наступний етап.

Мобільний клієнт має власний, окремий публічний OIDC-клієнт (той самий issuer і audience, свій `client_id`, redirect на схему `apchats://auth/callback` з `mobile/app.json`) — зареєструйте його в Accounts так само, як веб-клієнт. Логін у мобільному застосунку відбувається системним браузером через `expo-auth-session` (PKCE), а не всередині WebView — WebView відкриває сайт лише після успішного входу, а токен передається в нього через bridge (`mobile/src/features/webview`). `web/`, відкритий у мобільній оболонці, не запускає власний SPA OIDC-флоу: WebView дописує `ApConnectMobile/1` у свій User-Agent, і `web/src/app/auth/nativeBridge.ts` розпізнає оболонку за ним (синхронно, без узгодження з ін'єкцією скрипта) — `window.ApConnectNative` лишається лише каналом повідомлень, а не ознакою присутності нативного застосунку. Заповніть `EXPO_PUBLIC_OIDC_*` у `mobile/.env`, щоб увімкнути екран входу — без них мобільний застосунок відкриває сайт без авторизації, як і раніше.

## Realtime основа

API має Socket.IO namespace `/chats` на тому самому порту. Клієнт передає access token у `auth.token`; gateway перевіряє його через той самий Accounts verifier, що й HTTP API, один раз при підключенні — без періодичної переперевірки чи таймера на строк дії токена. Після входу сокет приєднується до персональної room користувача та отримує `session:ready`. Сокет — лише канал доставки подій від сервера; усі дії клієнта (надіслати повідомлення, приєднатися до розмови, отримати історію) йдуть через REST під тим самим `AuthGuard`, а членство в room синхронізується сервером одразу після зміни доступу в БД, а не за розкладом.

`src/globals/realtime` містить внутрішній транспортний адаптер і порт `RealtimePublisher`; `src/components/bootstrap` відповідає за lifecycle з'єднання. Це інфраструктура Chats, а не окремий бізнес-компонент чи зовнішній shared-пакет. Поки що подій чатів і підписок на розмови немає. Підписку на `conversation:{id}` додамо разом із членством і перевіркою права читання в БД; майбутні компоненти чатів і сповіщень використовуватимуть порт публікації.

## Перевірки

```bash
pnpm quality
pnpm test
pnpm --filter @ap-chats/web lint
pnpm --filter @ap-chats/web typecheck
pnpm --filter @ap-chats/web build
pnpm --filter @ap-chats/mobile lint
pnpm --filter @ap-chats/mobile typecheck
```

ESLint сортує імпорти; pre-commit перевіряє staged файли, commit-msg — формат Conventional Commits. CI окремо перевіряє API, web і mobile; автоматичного деплою поки немає.

## Що далі

1. Зробити канали й особисті розмови зі збереженою історією, доступом за членством, непрочитаними повідомленнями та відновленням після розриву з’єднання. Базова OIDC-автентифікація вже є; правила чатів спочатку живуть у Chats.
2. Розширити Accounts спільними ролями й підрозділами та синхронізувати відкликання доступу з Chats за [відкладеним планом](docs/future-iam-and-chat-access.md).
3. Додати дзвінки через LiveKit. API перевірятиме участь у виклику й видаватиме короткочасні токени; LiveKit не зберігатиме історію чату.
4. Додати native push, звук і системний екран вхідного дзвінка. Сам WebView цього не забезпечує; перевірити роботу на реальних iOS та Android пристроях.
5. Провести пілот з командою й погодити перехід із Discord, зокрема долю старої історії.
