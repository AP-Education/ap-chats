# iOS attachment preview regression

This harness runs the production `WebViewHost` inside an existing SDK 58 AP App development client. The fixture uses the same download anchor as chat attachments and serves Markdown, PDF and a missing file. Accounts and production conversations are not used.

Use Node 24. Start the fixture from the repository root:

```sh
node test/file-preview-native/serve.mjs
```

Link the mobile dependencies once, then start Metro:

```sh
ln -s ../../mobile/node_modules test/file-preview-native/node_modules
cd test/file-preview-native
EXPO_NO_DOTENV=1 EXPO_PUBLIC_WEB_URL=http://127.0.0.1:5586/ EXPO_PUBLIC_API_URL=http://127.0.0.1:5572 node node_modules/expo/bin/cli start --dev-client --localhost --port 8084
```

Open the existing AP App development client in Simulator:

```sh
xcrun simctl openurl booted 'exp+ap-app://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8084'
```

## Checks

1. Type a draft, open the text attachment and scroll the document. The native Close button stays below the status bar and outside the document's scrolling area.
2. Close the preview. The chat, draft and session marker stay unchanged. The main WebView has not navigated to the file.
3. Repeat with the PDF, including closing before it finishes loading.
4. Open the unavailable file, retry and close it. An error cannot hide or disable Close.
5. Repeat opening and closing. A download URL never becomes the app's restored page.

`GET http://127.0.0.1:5586/qa/reports` returns fixture session markers and drafts, so a reload or lost draft can be checked without production data. The fixture can also trigger its actual download button with a POST to `/qa/command`, such as `{"file":"sample.pdf"}` or `{"file":"broken.pdf"}`. `{"file":"expired.pdf"}` exercises an expired signed URL whose 403 response has no download header. Adding `?open=md` to the fixture URL reproduces the text-file path automatically.

Unit regressions:

```sh
node --import tsx --test mobile/src/features/file-preview/utils/preview-source.spec.ts mobile/src/features/webview/api/last-location.spec.ts
```
