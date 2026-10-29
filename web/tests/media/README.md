# Video previews in chat

Run `pnpm --filter @ap-chats/web test:media` from the repository root. Install the matching Playwright Chromium first with `pnpm --filter @ap-chats/web exec playwright install chromium`.

The suite builds the fixture before testing it. It covers private poster loading, explicit playback, errors, legacy attachments and the production message timeline, bubbles, captions, timestamps and composer. Browser requests use a local fixture API and generated test files. No account or storage credentials are required.

Projects cover desktop, 390 px and 320 px; the media scenarios use 4x CPU throttling. Screenshots and failure traces are written to `test-results/video-previews`. `PLAYWRIGHT_EXECUTABLE_PATH` and `PLAYWRIGHT_CHANNEL` optionally select an already installed local test browser.

For visual inspection, run `pnpm --filter @ap-chats/web exec vite preview --config tests/media/vite.config.mts` after building. Open `http://127.0.0.1:5568/?chat`; add `&portrait`, `&own` or `&legacy` for the other message layouts. The isolated media view is available without `chat`.

The committed test clips and posters are synthetic. Regenerate them with `node web/tests/media/generate-fixtures.mjs`; regeneration needs FFmpeg and the repository's Sharp dependency. The API tests exercise the real decoder separately.
