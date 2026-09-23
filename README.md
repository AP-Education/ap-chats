# AP Connect

AP Connect — місце для щоденного спілкування команди AP. Ми хочемо перенести розмови з Discord у власний застосунок: канали для команд і тем, особисті повідомлення та дзвінки в одному інтерфейсі. Людина входить тим самим обліковим записом, що й в інші продукти AP.

Зараз це **scaffold**, не готовий чат: працюють API з `/api/health/live`, вебнавігація й мобільна оболонка для відкриття вебсайту. Вхід, повідомлення, дзвінки та push-повідомлення ще не реалізовані. [План MVP](docs/plan.md) фіксує порядок і критерії готовності.

## Структура

```text
src/       NestJS API; згодом тут житимуть auth, chat, calls і notifications
web/       React + Vite + Ant Design, сторінки та MainLayout
mobile/    Expo + WebView; згодом native push і системне вікно дзвінка
infra/     локальні Postgres і Redis; без Kubernetes
docs/      архітектура, план, версії та інтеграційні рішення
```

Корінь є backend-пакетом у pnpm workspace; `web` і `mobile` мають власні пакети. Це дає один lockfile, але окремі команди та CI для кожної частини. `apps/`, `packages/` і порожні «на майбутнє» каталоги не потрібні. Нові доменні папки створюємо, коли з'являється робочий вертикальний зріз.

## Локальний запуск

Потрібні Node 24 LTS, pnpm 11.17.0 та Docker для майбутнього persistence-зрізу.

```bash
cp .env.example .env
cp mobile/.env.example mobile/.env
corepack enable
pnpm install --frozen-lockfile
pnpm dev                # API: http://localhost:3211/api/health/live
pnpm dev:web            # Web: http://localhost:5173
pnpm infra:up           # Postgres і Redis, поки API їх не використовує
pnpm --filter @ap-connect/mobile start
```

На телефоні `localhost` означає сам телефон: для `mobile/.env` потрібна доступна з пристрою адреса веба. У production — HTTPS. Нативні push і вхідний дзвінок потребуватимуть development/release build; зміни вебсторінок можна доставляти окремо від мобільного бінарника.

Перевірки виконуються окремо:

```bash
pnpm quality
pnpm --filter @ap-connect/web lint
pnpm --filter @ap-connect/web typecheck
pnpm --filter @ap-connect/web build
pnpm --filter @ap-connect/mobile lint
pnpm --filter @ap-connect/mobile typecheck
```

Коміти: `feat(api): add channel membership`. `pre-commit` запускає ESLint (з автоматичним сортуванням імпортів) і Prettier тільки для staged файлів, `commit-msg` перевіряє Conventional Commits. Повні збірки виконуються в CI. Ми використовуємо **ESLint для всього TypeScript**; Oxlint із шаблону Vite прибрано.

CI навмисно має три короткі workflow: `src/` запускає API, `web/` — web, `mobile/` — mobile. Зміна кореневих конфігів (`*.json`, `*.yaml`, `*.mjs`, `.nvmrc`, `.prettier*`) запускає всі три, бо там спільний lockfile та правила інструментів; README і `docs/` самі по собі збірки не запускають. Це тільки перевірки, не автоматичний деплой. Якщо ці jobs стануть обов'язковими в branch protection, path filters слід переглянути: пропущений GitHub workflow може залишити required check у стані pending.

## Важливі межі

- Accounts у `backend-LMS` є джерелом автентифікації. Connect не створює власних паролів і не використовує Discord як identity provider. Зараз Accounts конфігурує лише dev OIDC client; перед входом у Connect потрібні окремий client, audience та перевірка реального login flow.
- Connect зберігатиме чати та дозволи у власній БД. LiveKit передаватиме медіа дзвінків; API видаватиме короткочасні токени тільки учасникам виклику.
- WebView відкриває вебінтерфейс; він не замінює native push, звук вхідного дзвінка чи системний call UI. Ці функції — окремий мобільний етап.

Деталі: [архітектура](docs/architecture.md), [план](docs/plan.md), [версії та оновлення](docs/versions.md).
