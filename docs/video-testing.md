# Video feature verification

The behavior and limits are defined in [ADR 0003](adr/0003-video-previews.md), with current channel access from ADR 0001 and immutable attachment snapshots from ADR 0002. Tests cover the feature in layers; browser fixtures use synthetic messages and a local API, while the HTTP integration uses the real compiled API, database, decoder and S3 provider.

## Coverage matrix

| Behavior                                      | Automated checks                                                                                                                                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| MP4/WebM inspection and private WebP creation | Real FFmpeg/FFprobe: dimensions, phone rotation, duration, ThumbHash, 960 px poster bound, exact 64 MiB eligibility and larger-file fallback                                                                 |
| Bounded and failed processing                 | Corrupt and audio-only media, byte mismatch, stalled/failed streams, network protocol rejection, temporary-file cleanup, shared image/video renderer and queue overload                                      |
| Completion lifecycle                          | Owner/channel/workspace checks, current posting access, ready/attached idempotency, concurrent and expired leases, multipart recovery, publish failure, access revocation and cancellation during processing |
| Upload and sending in chat                    | Actual composer, upload queue and outbox: sending before processing finishes, preserving captions, cancelling a reservation, retrying a failed upload and one acknowledged message                           |
| Private file access                           | All three variants check live messages and current access; real S3 rejects unsigned requests, serves original byte ranges and distinguishes inline playback from downloads                                   |
| Persistence and forwarding                    | Real HTTP posting rejects forged metadata, retries idempotently and forwards the server-generated attachment snapshot; posting/history integration checks stored attachment metadata                         |
| Expiry and deletion                           | Original and poster removed together; a live forward retains both; retries after partial deletion, renewed rows, overlapping sweeps and scheduler shutdown                                                   |
| Chat presentation                             | Incoming/own messages, dark theme, landscape/portrait, old videos, captionless timestamps, multiple videos, no duplicate file card, separate download and accessible keyboard activation                     |
| Lazy loading                                  | Offscreen posters wait for intersection; originals load on explicit opening, adjacent videos wait until selected; slow loading retains a visible poster/status                                               |
| Playback and controls                         | Real decoded playback, pause/resume, seeking without gallery navigation, autoplay rejection, gallery paging, long captions, phone rotation and control clearance                                             |
| Failures and recovery                         | Missing/denied posters, denied or expired playback URLs, decode errors, retry/refetch, download errors and duplicate-press prevention, failed lazy gallery bundle                                            |
| Leaving the viewer                            | Close and Escape, return focus, pause detached video, leave during opening and leave before lazy module arrival without a late modal                                                                         |
| Android WebView                               | Instrumentation exercises the real chat UI, real touch playback, portrait controls, captions, download touch target, compact timestamps and legacy videos                                                    |

## Run locally

Use the Node and pnpm versions declared by the repository. Install FFmpeg/FFprobe for backend tests.

```sh
pnpm test:api
pnpm test:web
pnpm --filter @ap-chats/web exec playwright install --with-deps chromium webkit
pnpm --filter @ap-chats/web test:media
```

Queue-related API tests require a local `valkey-server`, or set `VALKEY_SERVER_BIN=redis-server`. Each test starts an isolated instance on a temporary port.

The HTTP integration uses its own disposable containers and synthetic credentials, skips application dotenv files, and disables external push workers. Ports 5437, 6387 and 9017 must be free. It creates only test workspaces in this database. Stop these containers after running:

```sh
docker compose --env-file /dev/null -f infra/docker-compose.uploads-test.yml up -d --wait
pnpm test:uploads:integration
docker compose --env-file /dev/null -f infra/docker-compose.uploads-test.yml down
```

API CI runs both the unit/integration suite and this HTTP/storage scenario. Web CI runs the Chromium and WebKit scenarios. Browser projects and synthetic fixture regeneration are documented in [the media suite](../web/tests/media/README.md).

For the attachment service coverage report:

```sh
node --import tsx --import ./src/testing/test-env.ts --test --test-concurrency=1 \
  --experimental-test-coverage \
  --test-coverage-include='src/components/social/attachments/**' \
  --test-coverage-exclude='**/*.spec.ts' src/components/social/attachments/*.spec.ts
```

This report measures the imported attachment modules, not the entire HTTP application or browser bundle. The black-box HTTP scenario and browser tests validate additional behavior outside those coverage counters.

## Native verification limits

The [Android harness](../test/video-native/android/README.md) is reproducible from committed test source. It embeds the fixture in a system WebView; it is a separate test package and does not change the AP App name or release signing.

Playwright WebKit validates browser rendering and playback but does not replace native iOS system-player testing. The document Fullscreen API test skips only when that API is unavailable. Authenticated Expo shell flows, native iOS fullscreen controls and device-specific codec support require a device/simulator pass in the full application before release.
