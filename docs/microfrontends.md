# Мікрофронтенди

Один продукт, кілька незалежно зібраних застосунків без стрибків інтерфейсу при переході між ними.

```text
shell/              host (Vite + Module Federation): OIDC, роутер, ThemeProvider, native bridge, реєстр, keep-alive
packages/shell-sdk  контракт для застосунків: AppModule, AppManifest, CurrentUser, MobileMenu, бейджі, native bridge
packages/shell-ui   спільний sider: рейка застосунків, слоти, мобільне меню, загальні хуки
packages/federation єдиний перелік singleton-залежностей для всіх vite.config
web/                Chats (remote "chats")
remotes/demo        приклад remote
```

## Спільний лейаут

`@ap/shell-ui` віддає `ShellLayout` як compound-компонент, тож будь-який host збирає каркас з тих самих деталей:

```tsx
<ShellLayout locationKey menuOpenByDefault unreadCount>
  <ShellLayout.Banner />
  <ShellLayout.Body>
    <ShellLayout.Sider>
      <ShellLayout.Main>
        <ShellLayout.Rail tiles onSelect onPrefetch />
        <ShellLayout.Panel />
      </ShellLayout.Main>
      <ShellLayout.Footer>...</ShellLayout.Footer>
    </ShellLayout.Sider>
    <ShellLayout.Content />
  </ShellLayout.Body>
  <AppHosts />
</ShellLayout>
```

`Footer` (картка користувача) займає всю ширину sider під рейкою й панеллю. Слоти (`useShellHosts()`) потрібні лише тим, хто монтує застосунки порталами. На мобільному `Sider` стає шторкою, решта деталей не змінюється.

## Як це працює

- Shell єдиний, хто володіє DOM-каркасом. `ShellLayout` малює рейку, слот панелі, слот контенту й верхню смугу.
- Застосунок віддає модуль `./module` через `defineApp({ Providers, Panel, Rail?, Content, Banner?, Ongoing? })`.
- `Providers` монтується один раз і живе, поки застосунок у кеші (до трьох останніх). Тому realtime, дані й дзвінки не обриваються при переході в інший застосунок.
- Sider складається з рейки (64px, як у Discord) і панелі застосунку. Рейка: плитки застосунків з `rail: 'tile'` (зараз «Головна» = demo), роздільник, потім плитки, які застосунок додає сам через `Rail` (`rail: 'contributed'`: Chats малює плитки воркспейсів і «+»). Такі застосунки змонтовані завжди, щоб їхні плитки не зникали.
- `Panel` (вміст sider), `Banner` (смуга над лейаутом, лише поки активний), `Ongoing` (смуга, що переживає навігацію, наприклад дзвінок) і `Content` рендеряться порталами в слоти shell-а, але у контексті `Providers` свого застосунку.
- `Panel` лишається змонтованою (прихованою) у кеші, `Content` монтується лише для активного застосунку.
- Який застосунок активний, shell визначає за `AppManifest.paths` (префікси URL). Chats зберіг свої адреси (`/`, `/channels`, `/direct`, `/calls`), тому push, deep links і мобільний застосунок не змінились.
- Рейка повертає на останню адресу застосунку і підвантажує його модуль при наведенні.
- Shell-sdk, react, react-router, antd, antd-style мають бути singleton (див. `packages/federation`), інакше контексти (auth, роутер, тема) ламаються мовчки.

## Додати застосунок

1. Новий пакет з `vite.config.ts` за зразком `remotes/demo` (`name`, `exposes: { './module': ... }`, `sharedSingletons(pkg)`).
2. Модуль: `export default defineApp({ ... })`.
3. Запис у `shell/src/apps/registry.ts` (id, label, icon, paths, home, env `VITE_MFE_<ID>_URL`).
4. Додати пакет у фільтри `dev:web`/`build:web`/`lint:web`/`typecheck:web` у кореневому `package.json`.

Застосунок без URL у `.env` просто відсутній у shell.

## Що отримує застосунок від shell-а

`useCurrentUser()` (токен, профіль, signOut), `useMobileMenu()`, `useIsAppActive()`, `useOpenApp()`, `useAppBadge(count)` (бейдж на рейці), `useBeforeSignOut(fn)`, `isNativeShell()/onNativeMessage()/postToNative()`. Тема, `QueryClient` не спільні: кожен застосунок тримає власний кеш даних.

## Обмеження поточної версії

- Service worker й manifest для web push мають віддаватися з origin shell-а (гілка `feat/chat-push-notifications` ще потребує цього переносу).
- `Content` неактивного застосунку розмонтовується, тому локальний стан сторінки (скрол, чернетки) не зберігається.
- У production потрібен єдиний gateway: shell на `/`, remote-и за власними URL з `VITE_MFE_*_URL` на етапі збірки shell-а.
