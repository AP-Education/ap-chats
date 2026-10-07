# AP Chats

Командний месенджер AP замість Discord: канали, особисті повідомлення, вкладення, дзвінки та push-сповіщення, з входом через спільний AP-акаунт.

[![AP Chats: відео-демо](docs/media/ap-chats.jpg)](docs/media/ap-chats.mp4)

## Структура

```text
src/       NestJS API (REST + Socket.IO)
web/       React-клієнт
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
pnpm install --frozen-lockfile
pnpm infra:up                            # Postgres, Valkey, LiveKit
pnpm dev                                 # міграції, потім API на :3211
pnpm dev:web                             # web на :5555
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
