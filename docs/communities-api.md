# Communities API: категорії, канали, права й ролі

Усі маршрути мають префікс `/api` і потребують чинного токена Accounts. `{workspaceId}`, `{categoryId}`, `{channelId}`, `{roleId}` і `{memberId}` є UUID. Категорії лише групують канали й не надають доступ. Модель доступу та її причини описані в [ADR 0001](adr/0001-roles-and-channel-access.md).

`@UseAuthGuards(WorkspaceMemberGuard('param', 'workspaceId'))` перевіряє токен та активну участь у workspace; guard кладе модель у request. Контролер отримує її через `@CurrentWorkspaceMember()` та передає сервісу. Guard'и лише встановлюють, хто питає. Кожне правило доступу живе в сервісі, бо ті самі дії приходять із REST, Socket.IO та інших модулів: рівень перевіряє `requireAccessLevel`, видимість і керування каналом `ChannelVisibility`, вміст каналу `ChannelAccessPolicy`.

Перевірка йде в тій самій транзакції, що й зміна. Для вмісту каналу `ChannelAccessPolicy` ще й блокує рядок каналу, тож відповідь лишається чинною до коміту.

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

Після зміни списків, складу ролі, видалення ролі чи виходу людини з workspace участь перераховується в тій самій транзакції. Новий учасник отримує курсор на останньому записі: історію видно, але непрочитаного немає.

## Участь

| Метод і шлях                                                       | Дія                                         |
| ------------------------------------------------------------------ | ------------------------------------------- |
| `GET /workspaces/{workspaceId}/channels/{channelId}/members`       | Активні учасники каналу                     |
| `DELETE /workspaces/{workspaceId}/channels/{channelId}/members/me` | Вийти, якщо людину вписали лише персонально |

Кроку «приєднатися» немає: участь випливає зі списків. Якщо доступ іде від ролі або всього workspace, вихід повертає `409`. Вимкнення людини у workspace в тій самій транзакції прибирає її участь у всіх каналах; її ID лишається.

## Події Socket.IO

Сервер надсилає їх у персональну кімнату після коміту зміни доступу. Усі несуть `workspaceId`.

| Подія                                     | Кому                                       | Дані          |
| ----------------------------------------- | ------------------------------------------ | ------------- |
| `communities:channel-granted`             | Тим, кому канал щойно відкрився            | `channelId`   |
| `communities:channel-revoked`             | Тим, хто щойно втратив канал               | `channelId`   |
| `communities:channel-permissions-changed` | Решті учасників каналу після зміни списків | `channelId`   |
| `communities:access-changed`              | Людям, чиї ролі змінилися                  | нічого більше |

## Будова модулів

Кожен контекст (`communities`, `workspaces`) має кореневий модуль, який лише збирає підмодулі. Підмодуль, що має бути головним для свого імені, лежить у теці-дублікаті (`channel-access/channel-access`). Barrel підмодуля віддає його модуль і те, що модуль експортує; типи й DTO імпортуються прямим шляхом. Залежності йдуть від атомів до молекул без циклів.

| Підмодуль                        | Відповідає за                                                                       | Залежить від                                  |
| -------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------- |
| `communities/channels`           | Сам канал: назва, категорія, вид; як його бачить людина                             | workspaces/access                             |
| `communities/channel-categories` | Категорії                                                                           | workspaces/access                             |
| `communities/channel-audience`   | Кому доставляти події каналу                                                        |                                               |
| `channel-access/channel-access`  | `ChannelAccessPolicy`: дії з вмістом каналу, у транзакції дії                       | channels                                      |
| `channel-access/visibility`      | `ChannelVisibility`: чи бачить людина канал у структурі та чи керує ним             | channels                                      |
| `channel-access/sync`            | Перерахунок участі за списками й ролями, подія `communities.channel.access-changed` | workspaces/access                             |
| `channel-access/permissions`     | Три списки каналу, вихід з персонального запрошення                                 | sync, visibility                              |
| `channel-access/notices`         | Хто про що дізнається після перерахунку (`accessNotices`), доставка в Socket.IO     | channel-audience, workspaces/members          |
| `communities/memberships`        | Учасники каналу                                                                     | visibility, permissions                       |
| `communities/channel-directory`  | Молекула: список каналів, відкриття разом зі списками, зміна, видалення             | channels, categories, visibility, permissions |
| `workspaces/access`              | Рівні та `requireAccessLevel`, реєстр `MemberAccessProjections`                     |                                               |
| `workspaces/members`             | Хто в workspace і на якому рівні, профіль людини, `WorkspaceMemberGuard`            | access                                        |
| `workspaces/roles`               | Каталог ролей: назва, колір, порядок, видалення; `RolesFacade` для інших модулів    | access, members                               |
| `workspaces/role-members`        | Склад ролей: хто в ролі, вступ і вихід разом із перерахунком доступу                | access, members, roles                        |
| `workspaces/workspaces`          | Самі workspace: створити, перелічити свої, змінити, видалити                        | access, members                               |

Ролі не знають про канали: `ChannelAccessSync` реєструється в `MemberAccessProjections`, а ролі й вихід із workspace звертаються лише до реєстру. Хто має роль, визначає лише view `active_role_members`: з нього читають кількість людей у ролі, склад, бейджі профілю, списки каналу, групи учасників і згадки ролі.

Повідомлення, pins, forwarding та read-state належать окремому [Social API](social-api.md).
