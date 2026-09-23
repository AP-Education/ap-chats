# Версії й правила оновлення

Станом на 2026-09-23. `pnpm-lock.yaml` фіксує точні транзитивні версії. `pnpm install --frozen-lockfile` — єдиний спосіб встановлення у CI. `packageManager` фіксує pnpm; `.nvmrc` та `engines` — Node 24 LTS. Локальний Node 22 може зібрати код, але release gate запускається на Node 24.

| Частина     | Обрано                                                                                                | Чому                                                                                                           |
| ----------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Runtime     | Node 24.21.0 LTS                                                                                      | Поточна LTS гілка й достатня версія для Nest 12 CLI                                                            |
| API         | Nest 12.1, Fastify 5, TypeScript 6                                                                    | Новий проєкт без legacy міграції; усі Nest пакети одного major                                                 |
| Конфіг/логи | `@nestjs/config` 12, Zod 4, `nestjs-pino` 5 / Pino 10                                                 | Fail-fast конфіг, структуровані HTTP-логи та request ID за патерном LMS                                        |
| Web         | Vite 8.3, React 19.2, Ant Design 6.5.4, icons 6.3.4                                                   | Офіційний `create-vite` шаблон, та сама основна версія Ant Design, що в front-LMS; icons 6 потрібен для AntD 6 |
| Mobile      | Expo SDK 57, React Native 0.86, `react-native-webview` 13.16.1                                        | Офіційний `create-expo-app`; WebView підібраний командою `expo install`                                        |
| Якість      | ESLint 10 + `simple-import-sort` 14 для всього TS, Prettier 3, Husky 9, lint-staged 17, commitlint 21 | Один linter, автоматичний порядок імпортів, швидкі локальні хуки                                               |

TypeScript 7 уже доступний, але Nest 12 міграційний гайд і Expo 57 scaffold наразі орієнтовані на TypeScript 6; оновлення TS зробити окремим PR з перевіркою трьох застосунків. pnpm 11.17 залишається зафіксованим для поточного lockfile; його major оновлювати разом із перевіркою frozen install та EAS.

`minimumReleaseAgeExclude` у workspace-файлі pnpm додав автоматично для щойно опублікованих версій. Це точкові винятки з його стандартної 24-годинної затримки, а не загальне вимкнення захисту; їх слід прибрати після дозрівання цих релізів. Для build-script `esbuild` використано актуальне для pnpm 11 поле `allowBuilds`.

Джерела для версій і сумісності: [Node releases](https://nodejs.org/en/about/previous-releases), [Nest 12 migration](https://docs.nestjs.com/migration-guide), [Ant Design 6 migration](https://ant.design/docs/react/migration-v6/), [Expo monorepos](https://docs.expo.dev/guides/monorepos/), [Expo WebView](https://docs.expo.dev/versions/latest/sdk/webview/).
