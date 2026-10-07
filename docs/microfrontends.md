# Мікрофронтенди

Один продукт, кілька незалежно зібраних застосунків без стрибків інтерфейсу при переході між ними.

```text
host/                 @ap/host        shell, що деплоїться: sider і рейка, кеш і монтування застосунків, OIDC, env
packages/shell-sdk    @ap/shell-sdk   контракт між shell-ом і застосунками
packages/ui           @ap/ui          дизайн-система: тема, примітиви, адаптивні хуки й жести
packages/federation   @ap/federation  перелік singleton-залежностей для vite.config
web/                  @ap-chats/web   Chats (remote "chats")
ai-native/web         окремий репозиторій, remote "ai" у корені `/`, ціль `src/apps/embedded` (гілка feat/mf-remote)
```

Чому Module Federation: [ADR 0001](adr/0001-microfrontends-module-federation.md). Межі пакетів і правила залежностей: [ADR 0002](adr/0002-shell-package-boundaries.md).

## Як це працює

- Shell єдиний володіє DOM-каркасом. `ShellHost` (`host/src/features/apps`) малює рейку, слот панелі, слот контенту й верхню смугу.
- Застосунок віддає модуль `./module` через `defineApp({ Providers, Panel, Rail?, Content, Banner?, Ongoing? })`.
- `Providers` монтується один раз і живе, поки застосунок у кеші (до трьох останніх). Тому realtime, дані й дзвінки не обриваються при переході в інший застосунок.
- Sider складається з рейки (64px, як у Discord) і панелі застосунку. Рейка: плитки застосунків з `rail: 'tile'` (зараз «AI»), роздільник, потім плитки, які застосунок малює сам через `Rail` (`rail: 'contributed'`: Chats малює плитки воркспейсів і «+» з `NavTile` з `@ap/ui`). Такі застосунки змонтовані завжди, щоб їхні плитки не зникали.
- `Panel` (вміст sider), `Banner` (смуга над лейаутом, лише поки активний), `Ongoing` (смуга, що переживає навігацію, наприклад дзвінок) і `Content` рендеряться порталами в слоти shell-а, але в контексті `Providers` свого застосунку.
- `Panel` лишається змонтованою (прихованою) у кеші, `Content` монтується лише для активного застосунку.
- Активний застосунок shell визначає за `AppManifest.paths` (префікси URL): перемагає найдовший префікс, тож застосунок з `/` отримує всі адреси, які не забрали інші. Зараз `/` належить AI, Chats живе під `/c` (шляхи в `web/src/shared/lib/paths.ts`). Push, deep links і `EXPO_PUBLIC_WEB_URL` мобільного застосунку мають вести на `/c/...`.
- Рейка повертає на останню адресу застосунку і підвантажує його модуль при наведенні.
- Тему підключає лише host (`ThemeProvider` з `@ap/ui`). Застосунки отримують її через портали, бо React-контекст через них проходить.

## Що отримує застосунок від shell-а

З `@ap/shell-sdk`: `useCurrentUser()` (токен, профіль, signOut), `useMobileMenu()`, `useMobileMenuTrigger()` (props для кнопки, що відкриває шторку на мобільному), `useIsAppActive()`, `useOpenApp()`, `useAppBadge(count)` (бейдж на рейці), `useBeforeSignOut(fn)`, `useShellLocation()` і `useShellNavigate()` (для застосунку з власним роутером), `isNativeShell()/onNativeMessage()/postToNative()`.

`QueryClient` не спільний: кожен застосунок тримає власний кеш даних.

## Додати застосунок

1. Окремий пакет (або репозиторій, як ai-native) з `vite.config.ts` за зразком `web/vite.config.ts` (`name`, `exposes: { './module': ... }`, `sharedSingletons(pkg)`). Залежності: `@ap/shell-sdk`, `@ap/ui`, antd, react.
2. Модуль: `export default defineApp({ ... })`.
3. Запис у `host/src/app/apps.ts` (id, label, icon, paths, home, env `VITE_MFE_<ID>_URL`).
4. Панель sider збирається з `Panel`, `PanelHeader`, `PanelNav`, `PanelNavItem`, `PanelSection` (категорії й групи списку), `PanelBody` з `@ap/ui`, тому всі застосунки виглядають однаково.

Застосунок з власним роутером (як TanStack Router в ai-native) не пише в `window.history` сам. Він будує history поверх `useShellNavigate()` і оновлюється, коли змінюється `useShellLocation()`. Його API має бути на власному origin з CORS, бо відносний `/api` піде на host. Глобальні стилі треба обмежити коренем застосунку: Tailwind preflight, правила для `body`/`html`, і особливо `*`-правила. Наприклад, поширене `@media (prefers-reduced-motion: reduce) { * { transition-duration: 0.01ms !important } }` дає кожному елементу на сторінці перехід, і antd починає позиціонувати поповери посеред руху, тож вони опиняються за межами екрана.

Кореневі скрипти фільтрують за шляхами (`./host`, `./web`, `./packages/*`), тому новий пакет у `packages/` потрапляє в lint і typecheck без змін у `package.json`; новий remote у цьому репозиторії треба додати до фільтрів. Застосунок без URL у `.env` просто відсутній у shell.

## Обмеження поточної версії

- Service worker і manifest для web push мають віддаватися з origin shell-а (гілка `feat/chat-push-notifications` ще потребує цього переносу).
- `Content` неактивного застосунку розмонтовується, тому локальний стан сторінки (скрол, чернетки) не зберігається.
- У production host віддається на `/`, а кожен remote за власним URL з CORS. Ці URL передаються host-у через `VITE_MFE_*_URL` на етапі збірки.
