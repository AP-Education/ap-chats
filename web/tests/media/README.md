# Video previews in chat

Run `pnpm --filter @ap-chats/web test:media` from the repository root. Install the matching browsers first with `pnpm --filter @ap-chats/web exec playwright install --with-deps chromium webkit`.

The suite builds the fixture before testing it. It uses the production message timeline, bubbles, composer, upload queue, outbox and media viewer. The local fixture API consumes multipart request bodies and acknowledges messages; it does not replace the upload or sending logic. Browser failures, delayed requests, autoplay rejection and conversation unmounting are injected by tests. No account or storage credentials are required. See [the coverage matrix](../../../docs/video-testing.md) for the separate real HTTP/storage tests.

Chromium projects cover desktop, 390 px and 320 px with 4x CPU throttling. WebKit covers a 390 px touch viewport at normal CPU speed because it has no CDP throttling API. Screenshots and failure traces are written to the repository's `test-results/video-previews`. `PLAYWRIGHT_EXECUTABLE_PATH` and `PLAYWRIGHT_CHANNEL` optionally select an installed Chromium browser; WebKit uses Playwright's matching installation.

The document Fullscreen API scenario is explicitly skipped when the browser does not expose that API. WebKit phone playback, seeking, closing, retries and sending still run. A desktop WebKit viewport does not validate the native iOS system fullscreen player or the authenticated Expo shell.

For visual inspection, run `pnpm --filter @ap-chats/web exec vite preview --config tests/media/vite.config.mts` after building. Open `http://127.0.0.1:5568/?chat`; add `&portrait`, `&own`, `&legacy`, `&multiple`, `&nocaption`, `&longcaption` or `&long` for other scenarios. The isolated media view is available without `chat`.

The committed clips and posters are synthetic. Regenerate them with `node web/tests/media/generate-fixtures.mjs`; regeneration needs FFmpeg, Sharp and Playwright Chromium. The WebM fixture is recorded as VP8 in Chromium, then remuxed by FFmpeg so it includes a finite duration. Generation is separate from CI tests: CI reads the committed files. The API tests exercise the real decoder separately.
