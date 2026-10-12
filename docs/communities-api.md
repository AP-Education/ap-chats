# Communities API: категорії, канали, права й ролі

Усі маршрути мають префікс `/api` і потребують чинного токена Accounts. `{workspaceId}`, `{categoryId}`, `{channelId}`, `{roleId}` і `{memberId}` є UUID. Категорії лише групують канали й не надають доступ. Модель доступу та її причини описані в [ADR 0001](adr/0001-roles-and-channel-access.md).

`@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))` перевіряє токен та активну участь у workspace; guard кладе модель у request. Контролер отримує її через `@CurrentWorkspaceMember()` та передає сервісу. Сервіси каналів перевіряють лише правила конкретного каналу; повторного пошуку workspace membership у них немає.

`workspace_members.user_profile_id` посилається на локальний `user_profiles`; зовнішній OIDC `userId` зберігається лише в профілі. Список учасників повертає `profile: {id, oidcUserId, displayName, avatarPath}`. Ім'я та аватар походять із перевіреного ID token і синхронізуються окремо від читання каналів.

## Рівні в компанії

`workspace_members.access_level` має значення `owner`, `manager` або `member`. Менеджер і адміністратор керують структурою: створюють канали, категорії й ролі, заповнюють ролі, змінюють списки будь-якого каналу і вимикають людей нижчого рівня. Адміністратор ще й призначає рівні. Зміст каналу рівень не відкриває: читати можна лише канали зі своїх списків.

| Метод і шлях                                                      | Дія                                            | Доступ               |
| ----------------------------------------------------------------- | ---------------------------------------------- | -------------------- |
| `PATCH /workspaces/{workspaceId}/members/{memberId}/access-level` | Змінити рівень `{accessLevel}`                 | Адміністратор        |
| `DELETE /workspaces/{workspaceId}/members/{userId}`               | Вийти самому або вимкнути людину нижчого рівня | Учасник або менеджер |

Адміністратор не змінює власний рівень і не виходить сам, тому в workspace завжди лишається щонайменше один адміністратор.

## Ролі

Роль є групою людей без власних прав. Права з'являються лише там, де роль вписана в списки каналу.

| Метод і шлях                                                         | Дія                                               | Доступ   |
| -------------------------------------------------------------------- | ------------------------------------------------- | -------- |
| `GET /workspaces/{workspaceId}/roles`                                | Ролі за назвою з `memberCount`                    | Учасник  |
| `POST /workspaces/{workspaceId}/roles`                               | Створити `{name, color?}`                         | Менеджер |
| `PATCH /workspaces/{workspaceId}/roles/{roleId}`                     | Змінити `name` і/або `color`                      | Менеджер |
| `DELETE /workspaces/{workspaceId}/roles/{roleId}`                    | Видалити роль разом із доступом, який вона давала | Менеджер |
| `GET /workspaces/{workspaceId}/roles/{roleId}/members`               | Люди в ролі                                       | Учасник  |
| `POST /workspaces/{workspaceId}/roles/{roleId}/members`              | Додати `{memberIds}` пакетом                      | Менеджер |
| `DELETE /workspaces/{workspaceId}/roles/{roleId}/members/{memberId}` | Прибрати людину з ролі                            | Менеджер |

## Категорії

| Метод і шлях                                                       | Дія                                    | Доступ   |
| ------------------------------------------------------------------ | -------------------------------------- | -------- |
| `GET /workspaces/{workspaceId}/channel-categories`                 | Список за `position`, потім `name`     | Учасник  |
| `POST /workspaces/{workspaceId}/channel-categories`                | Створити `{name, position?}`           | Менеджер |
| `PATCH /workspaces/{workspaceId}/channel-categories/{categoryId}`  | Змінити `name` і/або `position`        | Менеджер |
| `DELETE /workspaces/{workspaceId}/channel-categories/{categoryId}` | Видалити; канали стануть без категорії | Менеджер |

## Канали

| Метод і шлях                                            | Дія                                                                        |
| ------------------------------------------------------- | -------------------------------------------------------------------------- |
| `GET /workspaces/{workspaceId}/channels`                | Канали з власних списків                                                   |
| `GET /workspaces/{workspaceId}/channels?scope=all`      | Усі канали workspace; лише для менеджерів                                  |
| `POST /workspaces/{workspaceId}/channels`               | Створити `{name, categoryId?, permissions}`; творець потрапляє в «Керують» |
| `GET /workspaces/{workspaceId}/channels/{channelId}`    | Канал зі своїх списків; менеджер отримує будь-який                         |
| `PATCH /workspaces/{workspaceId}/channels/{channelId}`  | Змінити `name` і/або `categoryId`; `null` прибирає категорію               |
| `DELETE /workspaces/{workspaceId}/channels/{channelId}` | Фізично видалити канал                                                     |

Канал повертається з `isOpen` (його бачить увесь workspace), `isMember` (він у списках людини й у її бічній панелі), `canPost` і `canManage`. `canManage` уже враховує менеджерів workspace. Змінювати й видаляти канал можуть ті, хто в «Керують», і менеджери. Створюють канали лише менеджери. Назви категорій і каналів унікальні в межах workspace без урахування регістру.

## Права каналу

| Метод і шлях                                                     | Дія                            | Доступ                 |
| ---------------------------------------------------------------- | ------------------------------ | ---------------------- |
| `GET /workspaces/{workspaceId}/channels/{channelId}/permissions` | Три списки з назвами адресатів | «Керують» або менеджер |
| `PUT /workspaces/{workspaceId}/channels/{channelId}/permissions` | Замінити всі три списки        | «Керують» або менеджер |

Тіло й відповідь мають вигляд `{view, post, manage}`, кожен список складається з адресатів `{kind: "everyone"}`, `{kind: "role", roleId}` або `{kind: "member", memberId}`. У відповіді роль має ще `name` і `color`, людина `displayName` і `avatarPath`. Хто керує, той і пише, а хто пише, той і бачить.

Після зміни списків, складу ролі чи видалення ролі участь перераховується в тій самій транзакції. Новий учасник отримує курсор на останньому записі: історію видно, але непрочитаного немає.

## Участь

| Метод і шлях                                                       | Дія                                         |
| ------------------------------------------------------------------ | ------------------------------------------- |
| `GET /workspaces/{workspaceId}/channels/{channelId}/members`       | Активні учасники каналу                     |
| `DELETE /workspaces/{workspaceId}/channels/{channelId}/members/me` | Вийти, якщо людину вписали лише персонально |

Кроку «приєднатися» немає: участь випливає зі списків. Якщо доступ іде від ролі або всього workspace, вихід повертає `409`. Вимкнення людини у workspace забирає доступ до всіх каналів без фізичного видалення ID.

## Події Socket.IO

Сервер надсилає їх у персональну кімнату після коміту зміни доступу. Усі несуть `workspaceId`.

| Подія                                     | Кому                                       | Дані          |
| ----------------------------------------- | ------------------------------------------ | ------------- |
| `communities:channel-granted`             | Тим, кому канал щойно відкрився            | `channelId`   |
| `communities:channel-revoked`             | Тим, хто щойно втратив канал               | `channelId`   |
| `communities:channel-permissions-changed` | Решті учасників каналу після зміни списків | `channelId`   |
| `communities:access-changed`              | Людям, чиї ролі змінилися                  | нічого більше |

Повідомлення, pins, forwarding та read-state належать окремому [Social API](social-api.md).
