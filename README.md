# AP Connect

AP Connect — місце для щоденного спілкування команди AP замість Discord. Тут мають бути канали, особисті повідомлення й дзвінки зі входом через спільний AP-акаунт. Перша версія має покрити щоденні розмови, а не повторити весь Slack.

Зараз це **scaffold**: працюють API health check, вебоболонка з навігацією та мобільний WebView. Вхід, чати, дзвінки й push-повідомлення ще не реалізовані.

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
cp mobile/.env.example mobile/.env
corepack enable
pnpm install --frozen-lockfile
pnpm dev                # API: http://localhost:3211/api/health/live
pnpm dev:web            # Web: http://localhost:5173
pnpm --filter @ap-connect/mobile start
pnpm infra:up           # необов'язково, локальні Postgres і Redis
```

На телефоні `localhost` — це сам телефон, тому в `mobile/.env` потрібна адреса веба, доступна з пристрою. У production веб має відкриватися через HTTPS.

## Перевірки

```bash
pnpm quality
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
