# AP Chats

Командний месенджер AP замість Discord: канали, особисті повідомлення, вкладення, дзвінки та push-сповіщення, з входом через спільний AP-акаунт.

[![AP Chats: відео-демо](docs/media/ap-chats.jpg)](docs/media/ap-chats.mp4)

## Структура

```text
src/       NestJS API (REST + Socket.IO)
web/       Chats як remote shell-а AP (ap-app)
mobile/    Expo-оболонка над web: вхід, push, нативні дзвінки
infra/     локальні сервіси та production-деплой
docs/      рішення й архітектура
```

Один pnpm workspace: корінь — API, `web` і `mobile` — окремі пакети зі спільним lockfile.

## Локальний запуск

Потрібні Node 24, pnpm 11 (через corepack) і Docker.

```bash
cp .env.example .env
cp web/.env.example web/.env
cp mobile/.env.example mobile/.env
corepack enable
pnpm config set //npm.pkg.github.com/:_authToken "$(gh auth token)"   # раз; токен з read:packages: gh auth refresh -s read:packages
pnpm install --frozen-lockfile
pnpm infra:up                            # Postgres, Valkey, LiveKit
pnpm dev                                 # міграції, потім API на :3211
pnpm dev:web                             # remote Chats на :5557, відкривати через host з ap-app
pnpm --filter @ap-chats/mobile start
```

Вхід працює через OIDC-клієнти Chats, зареєстровані в AP Accounts (`backend-LMS`); issuer, audience і client ID задаються в `.env` файлах.

## Перевірки

```bash
pnpm quality   # lint, typecheck, build API
pnpm test      # API, web, mobile
```

## Далі

- Деплой: [infra/README.md](infra/README.md)
- Push-сповіщення: [docs/push-notifications.md](docs/push-notifications.md)
- Вкладення: [docs/chat-uploads.md](docs/chat-uploads.md)

Chats — Module Federation remote shell-а AP. Shell (host) і пакети `@ap-education/*` живуть у репозиторії `ap-app`; `web/` бере пакети з GitHub Packages, тож `pnpm install` потребує токена з `read:packages`.
