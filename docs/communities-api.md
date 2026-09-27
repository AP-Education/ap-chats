# Communities API: категорії, канали й учасники

Усі маршрути мають префікс `/api` і потребують чинного токена Accounts. `{workspaceId}`, `{categoryId}`, `{channelId}` і `{memberId}` — UUID. Категорії лише групують канали й не надають доступ.

`@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))` перевіряє токен та активну участь у workspace; guard кладе модель у request. Контролер отримує її через `@CurrentWorkspaceMember()` та передає сервісу. Сервіси каналів перевіряють лише правила конкретного каналу; повторного пошуку workspace membership у них немає.

`workspace_members.user_profile_id` посилається на локальний `user_profiles`; зовнішній OIDC `userId` зберігається лише в профілі. Список учасників повертає `profile: {id, oidcUserId, displayName, avatarPath}`. Ім'я та аватар походять із перевіреного ID token і синхронізуються окремо від читання каналів.

## Категорії

| Метод і шлях                                                       | Дія                                    | Доступ            |
| ------------------------------------------------------------------ | -------------------------------------- | ----------------- |
| `GET /workspaces/{workspaceId}/channel-categories`                 | Список за `position`, потім `name`     | Учасник workspace |
| `POST /workspaces/{workspaceId}/channel-categories`                | Створити `{name, position?}`           | Власник workspace |
| `PATCH /workspaces/{workspaceId}/channel-categories/{categoryId}`  | Змінити `name` і/або `position`        | Власник workspace |
| `DELETE /workspaces/{workspaceId}/channel-categories/{categoryId}` | Видалити; канали стануть без категорії | Власник workspace |

## Канали

| Метод і шлях                                            | Дія                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `GET /workspaces/{workspaceId}/channels`                | Усі доступні: публічні та приватні, до яких вступив користувач                        |
| `GET /workspaces/{workspaceId}/channels?scope=joined`   | Лише канали з активною участю                                                         |
| `POST /workspaces/{workspaceId}/channels`               | Створити `{name, kind: "public" \| "private", categoryId?}`; творець вступає атомарно |
| `GET /workspaces/{workspaceId}/channels/{channelId}`    | Отримати доступний канал                                                              |
| `PATCH /workspaces/{workspaceId}/channels/{channelId}`  | Змінити `name` і/або `categoryId`; `null` прибирає категорію                          |
| `DELETE /workspaces/{workspaceId}/channels/{channelId}` | Фізично видалити канал                                                                |

У списку та відповіді окремого каналу є `isMember`. Будь-який активний учасник workspace може бачити публічний канал; приватний повертається лише його учаснику, інакше `404`. Створити канал може будь-який активний учасник workspace. Публічний канал змінює чи видаляє його творець або власник workspace; приватний — будь-який його учасник. Видалення фізичне; майбутня історія каналу видаляється разом із ним. Назви категорій і каналів унікальні в межах workspace без урахування регістру.

## Участь

| Метод і шлях                                                               | Дія                                               |
| -------------------------------------------------------------------------- | ------------------------------------------------- |
| `GET /workspaces/{workspaceId}/channels/{channelId}/members`               | Активні учасники доступного каналу                |
| `POST /workspaces/{workspaceId}/channels/{channelId}/join`                 | Самостійно вступити в публічний канал             |
| `POST /workspaces/{workspaceId}/channels/{channelId}/members`              | Додати активного учасника workspace: `{memberId}` |
| `DELETE /workspaces/{workspaceId}/channels/{channelId}/members/me`         | Вийти з каналу                                    |
| `DELETE /workspaces/{workspaceId}/channels/{channelId}/members/{memberId}` | Видалити учасника каналу                          |

Додавати людей може поточний учасник каналу. Видаляти інших із публічного каналу може творець або власник workspace за умови власної участі; із приватного — будь-який його учасник. Останній активний учасник приватного каналу не може вийти, доки не додасть іншого. Повторний вступ або додавання учасника повертає наявний membership. Вихід із приватного каналу одразу забирає доступ до нього. Вихід із workspace деактивує `workspace_members` і забирає доступ до всіх каналів без фізичного видалення ID.

Повідомлення, pins, forwarding та read-state належать окремому [Social API](social-api.md). DM і дзвінки поки не реалізовані.
