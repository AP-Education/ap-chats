# AP Connect

AP Connect — місце для щоденного спілкування команди AP замість Discord. Тут мають бути канали, особисті повідомлення й дзвінки зі входом через спільний AP-акаунт. Перша версія має покрити щоденні розмови, а не повторити весь Slack.

Зараз це **scaffold**: працюють API health check, вебоболонка з навігацією, мобільний WebView і базове підключення до AP Accounts через OIDC. Чати, дзвінки й push-повідомлення ще не реалізовані.

## Структура

```text
src/       NestJS API
web/       React, Vite, Ant Design; сторінки й layout
mobile/    Expo-оболонка для веба
infra/     локальні Postgres і Redis
```

Корінь — backend-пакет; `web` і `mobile` — окремі пакети в одному pnpm workspace. У них окремі перевірки й майбутні релізи, але спільний lockfile. Конфігурація та логування API локально адаптовані з `backend-LMS`: це свідоме дублювання, не shared-пакет.

## Локальний запуск

Потрібні Node 24 LTS і pnpm 11.17.0. Docker потрібен лише для локальних Postgres і Redis, які API поки не використовує.

```bash
cp .env.example .env
cp web/.env.example web/.env
cp mobile/.env.example mobile/.env
corepack enable
pnpm install --frozen-lockfile
pnpm dev                # API: http://localhost:3211/api/health/live
pnpm dev:web            # Web: http://localhost:5555
pnpm --filter @ap-connect/mobile start
pnpm infra:up           # необов'язково, локальні Postgres і Redis
```

На телефоні `localhost` — це сам телефон, тому в `mobile/.env` потрібна адреса веба, доступна з пристрою. У production веб має відкриватися через HTTPS.

## Спільний вхід

У `backend-LMS` потрібно зареєструвати окремий публічний OIDC-клієнт Connect з `application_id`, authorization code + PKCE, redirect URI `http://localhost:5555/auth/callback` і дозволити web origin у CORS. У кореневому `.env` задайте `OIDC_ISSUER` (точний issuer Accounts) та `OIDC_AUDIENCE` (resource audience цього API); у `web/.env` — ті самі issuer й audience та виданий `VITE_OIDC_CLIENT_ID`. Для production використовуйте HTTPS і відповідні production URI. Секрет клієнта у вебі не потрібний і зберігати його там не можна.

Web запитує access token для цього resource; API перевіряє підпис за JWKS Accounts, issuer, audience, час дії та identity. `GET /api/auth/me` повертає лише перевірені `sub` і `appId`, не повний профіль LMS. Без реєстрації Connect-клієнта в Accounts браузерний вхід не запрацює. Кнопка «Вийти з Connect» поки очищає тільки локальну сесію; logout в Accounts і окремий native OIDC flow для мобільного клієнта — наступний етап.

## Перевірки

```bash
pnpm quality
pnpm test
pnpm --filter @ap-connect/web lint
pnpm --filter @ap-connect/web typecheck
pnpm --filter @ap-connect/web build
pnpm --filter @ap-connect/mobile lint
pnpm --filter @ap-connect/mobile typecheck
```

ESLint сортує імпорти; pre-commit перевіряє staged файли, commit-msg — формат Conventional Commits. CI окремо перевіряє API, web і mobile; автоматичного деплою поки немає.

## Що далі

1. Підключити Connect до AP Accounts через OIDC і перевірити вхід у браузері та на телефоні. Connect не зберігатиме власні паролі.
2. Зробити канали й особисті розмови зі збереженою історією, доступом за членством, непрочитаними повідомленнями та відновленням після розриву з’єднання.
3. Додати дзвінки через LiveKit. API перевірятиме участь у виклику й видаватиме короткочасні токени; LiveKit не зберігатиме історію чату.
4. Додати native push, звук і системний екран вхідного дзвінка. Сам WebView цього не забезпечує; перевірити роботу на реальних iOS та Android пристроях.
5. Провести пілот з командою й погодити перехід із Discord, зокрема долю старої історії.
