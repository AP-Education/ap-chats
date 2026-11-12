# Native composer overflow check

Use Node 24 and an existing AP App development client with the native dependencies in `mobile/`. The harness mounts production `WebViewHost` and `AppProviders`. The sign-in token is synthetic and only held in memory; saved app navigation is reset for this fixture.

Start the web fixture using the commands in `web/tests/composer-intents/README.md`. Give this harness access to the already installed mobile dependencies:

```sh
ln -s ../../mobile/node_modules test/composer-intents-native/node_modules
cd test/composer-intents-native
EXPO_NO_DOTENV=1 EXPO_PUBLIC_WEB_URL=http://127.0.0.1:5587/ EXPO_PUBLIC_API_URL=http://127.0.0.1:5572 node node_modules/expo/bin/cli start --dev-client --localhost --port 8085
```

Open the existing development client:

```sh
xcrun simctl openurl booted 'exp+ap-app://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8085'
```

1. Enter a draft and tap Reply or Quote.
2. Tap the field and show the Simulator software keyboard when using a hardware keyboard.
3. Check that the original close control remains within the field, then tap it. The quote disappears and the draft remains.
4. Repeat with a multiline draft, another reply and a StarMe context. Cancel each context and return to typing.
5. After cancelling a quote, send the synthetic draft and check that the displayed payload has no `replyToMessageId` or `quoteText`.

No native rebuild, Accounts login or production messages are needed. The fixture's header and history are synthetic; the composer uses its existing production layout and styles.
