# Composer overflow regression

The fixture mounts the production `MessageComposer`, `ComposerIntent`, `MentionEditor` and conversation store. Only authentication, upload policy and conversation history use synthetic data. Nothing is posted to a real conversation.

Run with Node 24 from the repository root:

```sh
pnpm --filter @ap-chats/web test:composer
```

The checks cover long reply authors, long message previews, unbroken quotes, StarMe context, cancelling while typing, multiline drafts above a keyboard inset, repeated cancellation and the absence of cancelled reply metadata on the next message. Chromium runs at 390px and 320px with CPU throttled 4x. WebKit uses a 390px phone viewport. The fixture does not restyle production composer components. CI runs the Chromium projects on Linux and WebKit on macOS.

## Native iOS

Start the fixture with:

```sh
node web/node_modules/vite/bin/vite.js --config web/tests/composer-intents/vite.config.mts
```

See `test/composer-intents-native/README.md` for the production WebView wrapper and software-keyboard checks.
