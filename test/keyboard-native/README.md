# Native keyboard regression

Uses the production `WebViewHost`, keyboard controller, native emoji panel and message composer. The web fixture imports `useNativeKeyboardInset` from a separate ap-app checkout via `AP_APP_QA_ROOT`. Accounts and production messages are not used; the token exists only in memory and the API has fixture data.

Use Node 24 and an existing AP App development client built with the native dependencies from `mobile/`. The fixture runs through Metro without building another native binary.

From this repository, start the fixture API:

```sh
node --import tsx web/tests/voice/serve-api.mts
```

Start the web fixture with the ap-app checkout containing the shell change:

```sh
AP_APP_QA_ROOT=/absolute/path/to/ap-app node web/node_modules/vite/bin/vite.js --config web/tests/keyboard/vite.config.mts
```

Give the harness access to the mobile dependencies, then start Metro from its directory:

```sh
ln -s ../../mobile/node_modules test/keyboard-native/node_modules
cd test/keyboard-native
EXPO_NO_DOTENV=1 EXPO_PUBLIC_WEB_URL=http://127.0.0.1:5582/native.html EXPO_PUBLIC_API_URL=http://127.0.0.1:5572 node node_modules/expo/bin/cli start --dev-client --localhost --port 8083
```

Open the existing iOS development client with:

```sh
xcrun simctl openurl booted 'exp+ap-app://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8083'
```

## Checks

1. Tap the message field, type multiple lines and use the onscreen Return key. The caret and text stay above the keyboard, with the header stationary.
2. Close and reopen the keyboard quickly, including reversing a move before it ends. The composer continues from its current position.
3. Open the native emoji panel, insert an emoji and return to the keyboard. Text, caret and panel height remain consistent.
4. Change the system keyboard language or suggestions height. The field stays above the new keyboard edge.
5. Switch conversations while the keyboard is open. The next conversation follows the keyboard closing without retaining the old offset.
6. Hide the Simulator's software keyboard to check the hardware-keyboard path. Restoring the software keyboard restores the inset.

Browser regressions, including a 320px viewport and Chromium with 4x CPU throttling:

```sh
node web/node_modules/@playwright/test/cli.js test --config web/tests/keyboard/playwright.config.ts
```
