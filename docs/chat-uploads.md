# Chat attachments

Implemented in `feat/scalable-chat-uploads`, initially based on `origin/main` at `3280d14`.
Scope: API and responsive web chat. Native mobile can reuse the same upload contract.

## Product decisions

Research checked on 2026-10-02:

- [Slack file sharing](https://slack.com/help/articles/201330736-Add-files-to-Slack): up to 1 GB per file, multiple attachments, previews and image descriptions. Adopt the familiar composer attachment strip, remove/retry controls, and image viewer.
- [Discord attachments](https://support.discord.com/hc/en-us/articles/25444343291031-File-Attachments-FAQ): plan-dependent limits, image mosaics, file download cards and mobile attachment controls. Adopt image grids and compact document cards with explicit download actions.
- [Slack external upload flow](https://docs.slack.dev/messaging/working-with-files/): separate initiation, byte transfer and completion. Adopt the same separation with private S3 multipart uploads.

| Policy                                 | Default                          |
| -------------------------------------- | -------------------------------- |
| File size                              | 1 GB = 1,000,000,000 bytes       |
| Files per message                      | 25                               |
| Total size per message                 | 2 GB                             |
| Part size                              | 16 MiB; 60 parts for a 1 GB file |
| Browser concurrency                    | 2 files, 2 parts each            |
| Incomplete upload sessions             | 24 hours                         |
| Uploaded but unsent files              | 7 days                           |
| Completion lease after process failure | 30 minutes                       |
| Signed upload/download URL             | 15 minutes                       |
| Outstanding uploads per member         | 20 files and 4 GB                |

`CHAT_UPLOAD_MAX_FILE_BYTES`, `CHAT_UPLOAD_MAX_MESSAGE_BYTES`, and `CHAT_UPLOAD_MAX_FILES` configure the public limits. The file ceiling remains 1 GB. The authenticated policy endpoint is the UI's source of truth. `CHAT_UPLOAD_MAX_PENDING_FILES`/`CHAT_UPLOAD_MAX_PENDING_BYTES` configure the outstanding-uploads reservation cap; `UploadPolicy.pendingLimitsFor(member)` is the one seam a future per-member/per-role quota plugs into.

### User flow

1. Select files, drag them anywhere in the conversation, or paste clipboard files.
2. See local image previews, names, sizes, upload progress and processing status. Remove or retry individual files; text stays editable while files upload. Selection rejects oversized, empty and excessive files before transfer.
3. Optionally add an image description for assistive technology. Send becomes available when all selected attachments are ready; a caption is optional.
4. Messages show a responsive image grid and document download cards. Images open in a keyboard-accessible viewer. Recognized audio/video start only on explicit interaction; media uses `preload="none"` and native controls.
5. Mobile uses horizontally scrolling draft cards with visible actions and a viewer constrained to the viewport. Desktop keeps a compact strip above the existing composer.

## Ownership and architecture

`src/components/uploads/attachments` owns policy, private upload sessions, media inspection and cleanup. `StorageProvider` owns S3 operations. Messaging owns attaching a ready file in the same transaction that inserts the message. Forwarding copies immutable attachment metadata and keeps the shared object alive.

`web/src/features/social/messaging/attachments` owns the upload queue and API contract. Composer parts own draft presentation, image descriptions and drop integration. `MessageAttachments` owns the message gallery, signed access and viewer. Remote policy/URLs use the existing query layer; `File`, XHR and object URLs stay in the mounted composer. The API outbox stores attachment IDs/metadata, never file bytes.

```mermaid
sequenceDiagram
    participant Browser
    participant API
    participant DB
    participant S3
    Browser->>API: Begin (name, size, channel)
    API->>DB: Authorize and reserve capacity
    API->>S3: Create private multipart session
    API-->>Browser: Session ID and part size
    loop Bounded Blob slices
        Browser->>API: Request signed part URL
        API-->>Browser: URL with exact signed Content-Length
        Browser->>S3: PUT slice, progress, bounded retries
    end
    Browser->>API: Complete
    API->>DB: Short transaction: acquire completion lease
    API->>S3: List/validate parts, complete, HEAD
    API->>S3: Inspect prefix; optional bounded thumbnail
    API->>DB: Short transaction: publish ready metadata
    API-->>Browser: Attachment metadata
    Browser->>API: Send caption + attachment refs (id, description) + nonce
    API->>DB: Claim ready files and create message atomically
```

### Memory and recovery

- Original file bytes travel directly from browser to S3. API ingress contains only small JSON requests. Browser sends `File.slice()` blobs without `arrayBuffer()`/base64 conversion. Four slices may be active, irrespective of total file size; browser/network implementations can allocate additional internal buffers.
- MIME is derived from a bounded 4,100-byte range via `file-type`'s signature detection, rather than trusting the filename or browser MIME. Inline preview for video/audio is further restricted to an explicit allowlist of formats browsers reliably play (`file-type` identifies far more containers than that).
- Image thumbnails are limited to 20 MiB source bytes, 20 million pixels and 10,000 pixels per dimension. Source bytes stream to a temporary file; thumbnail output is bounded to 960 px. One render and at most four waiters are allowed per API process. Larger/unsupported files remain download cards.
- Storage requests, image streaming and rendering have time limits. Completion processing does not hold a channel lock or a database connection during storage/thumbnail work. A database lease coordinates completion across API replicas. An interrupted process releases its lease after 30 minutes; storage completion is recovered through `NoSuchUpload` plus an authoritative HEAD check.
- Part sizes/order/count are verified using S3 `ListParts`; final object size is verified using HEAD. The client does not supply authoritative ETags or sizes.
- Automatic part retries use fresh signed URLs and exponential delays. Manual retry preserves successful chunks while the composer remains mounted. Removing/changing conversation cancels unfinished uploads and revokes local object URLs. Reload does not resume unsent file selection; already submitted outbox messages retain IDs for retry.
- Message creation claims attachments atomically with nonce idempotency. Existing text-only message digests are unchanged, so pending text retries remain compatible after deployment.

### Access and cleanup

Objects and thumbnails are private. Downloads recheck current channel read access and a live message reference before issuing a short-lived URL. Signing uploads requires current channel post access and session ownership. HTML/SVG/PDF/Office content is served as a download, not executable inline content.

A previously issued signed URL remains usable until its expiry, including after message deletion or access revocation. New URL requests are denied immediately. Forwarded messages can legitimately authorize the same object through their own channel.

Cleanup checks the expiry index in batches of 50 every minute and locks each ledger row. Failed objects do not block other items in the batch. Ready/incomplete/cancelled uploads are removed when due. Attached files are retained while any nondeleted message references them and rechecked daily. The JSONB GIN index supports reference lookup. Channel/member deletion retains the storage ledger so orphaned objects remain discoverable. Cleanup is safe across API replicas; its bounded batch throughput should be sized to retention volume before very large deployments.

Configure storage lifecycle abortion of incomplete multipart uploads after at least one day as insurance for failures between S3 session creation and database commit. Do not add age-based deletion rules for completed chat objects: live/forwarded message references determine retention.

## Deployment

The feature uses the existing DigitalOcean Spaces configuration. It needs multipart, ListParts, HEAD, GET and private object PUT/DELETE permissions for `chat-attachments/*`.

1. Apply migrations `0016_military_power_man.sql` and `0017_clear_bucky.sql` through the existing migration mechanism before enabling clients.
2. Keep the `chat-attachments/*` prefix private. Existing public avatar ACLs must not be accompanied by a bucket policy granting anonymous read to the entire bucket.
3. Configure Spaces CORS for each exact web origin. Allow `PUT`, `GET`, `HEAD`; allow `Content-Type` and `Range` headers. Browser requests do not send API Authorization to storage. No browser ETag exposure is needed because API reads authoritative ListParts.
4. Add incomplete multipart lifecycle abortion and monitor storage failures, unfinished reservations and cleanup lag. A 1 GB upload travels to storage directly; reverse-proxy API body limits should remain small.

See [Spaces CORS](https://docs.digitalocean.com/products/spaces/how-to/configure-cors/) and [Spaces S3 compatibility](https://docs.digitalocean.com/reference/api/spaces/).

Example CORS configuration (replace the example origin):

```json
[
  {
    "AllowedOrigins": ["https://chat.example.com"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type", "Range"],
    "MaxAgeSeconds": 3600
  }
]
```

Native mobile UI, antivirus scanning, rich PDF/Office previews, cross-reload upload resumption and storage quota/billing controls are outside this implementation. The policy/session and metadata contracts allow those capabilities to be added separately.

## Verification

Use the project-required Node 24 and pnpm versions.

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm --filter @ap-chats/web typecheck
pnpm lint:web
pnpm build
pnpm build:web
pnpm test:uploads:web
```

Browser tests use actual chat components with mocked API/storage and cover 1440×900, 390×844 and 320×740: previews, file-only messages, oversized-file preflight, failed-chunk retry, keyboard viewer, clipboard and history drag/drop. Playwright writes screenshots under `test-results/attachments/`.

The integration script uses only the dedicated localhost test services below, with credentials explicitly set in the script. It migrates its isolated PostgreSQL database and tests real S3 signed multipart transfer, signature tampering, private access, nonce idempotency, forwarding, thumbnails and orphan cleanup. It streams a reusable 64 KiB chunk; `--large` transfers a real 1 GB object.

```sh
docker compose -f infra/docker-compose.uploads-test.yml up -d --wait
pnpm test:uploads:integration
pnpm build
node --import tsx test/uploads.integration.mts --large
docker compose -f infra/docker-compose.uploads-test.yml down -v
```

The test only accepts dedicated local endpoints (ports 5437 and 9017) and never reads production credentials. SeaweedFS provides a local S3-compatible server; production Spaces CORS/permissions must also be checked in the deployment environment.
