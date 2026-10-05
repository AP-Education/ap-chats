# ap-connect deploy

Single droplet, no load balancer. Postgres, Valkey, the API and a Caddy edge (static
`web/` build + reverse proxy) run together on one host via Docker Compose.
Images are built locally and pushed to GHCR by hand — there is no CI/CD
pipeline here on purpose; every step below is run manually from a developer
machine.

```
infra/
  docker/        Dockerfile.api, Dockerfile.web, Caddyfile
  terraform/     modules/ (droplet, firewall) + prod/ root + tenants/ backends
  cloud-init/    minimal user-bootstrap cloud-init (Ansible does the rest)
  ansible/       collection (roles) + playbooks + terraform-backed inventory
  scripts/       build-and-push.sh
```

## One-time setup

1. **DNS/domain**: this provisions `chats.ap-platform.online` pointed at the
   droplet's IP (see `domain_name` / `chats_subdomain` in
   `terraform/prod/variables.tf`). If the `ap-platform.online` zone is
   already managed elsewhere (e.g. backend-LMS's Terraform), leave
   `manage_domain = false` (the default) so this root only adds its own `A`
   record into the existing zone.
2. **Terraform state backend**: copy
   `terraform/tenants/backend.sample.tfbackend` to
   `terraform/tenants/backend.prod.tfbackend` and set `key` to
   `chats/prod/terraform.tfstate`. This reuses backend-LMS's own Backblaze
   B2 bucket (`ap-lms`) — same ecosystem, same credentials, one bucket to
   manage instead of a dedicated one per project. Nothing to create: the
   bucket already exists, this just adds a new key prefix in it. Weaker
   isolation than a dedicated bucket (whoever holds this credential can
   reach LMS's state too) is the accepted tradeoff for that simplicity.
3. **DigitalOcean Spaces key** (a _different_ credential from the state
   backend above — this one is for the two app buckets, on DigitalOcean,
   not Backblaze): create one dedicated to ap-connect — DO dashboard → API
   → Spaces Keys → "Generate New Key". DO Spaces keys can be scoped to
   specific buckets (`--grants 'bucket=ap-connect-prod;permission=...'` via
   `doctl spaces keys create`), so this one doesn't need backend-LMS's
   broader access. You'll use this same key pair twice: once below to let
   Terraform create the buckets, and once in the vault (step 4) for the app
   and backup script to read/write objects in them.
4. **Secrets**: copy
   `ansible/inventory/group_vars/prod/vault.yml.example` to
   `ansible/inventory/group_vars/prod/vault.yml` and encrypt it:
   ```bash
   ansible-vault encrypt infra/ansible/inventory/group_vars/prod/vault.yml
   ```
   Edit later with `ansible-vault edit infra/ansible/inventory/group_vars/prod/vault.yml`.
   Fill the optional LiveKit and mobile VoIP push groups as described below
   before deploying calls.
5. **Ansible collections**:
   ```bash
   ansible-galaxy collection install -r infra/ansible/requirements.yml -p infra/ansible/collections
   ```
6. **Shared env file**: copy `infra/terraform/prod/.env.example` to
   `infra/terraform/prod/.env` and fill it in — the DO token, the
   Backblaze B2 key pair (state backend), the ap-connect Spaces key pair
   from step 3, `allowed_ssh_cidrs`, `ssh_key_ids`, plus the Ansible-side
   `ANSIBLE_VAULT_PASSWORD_FILE` / `ANSIBLE_PRIVATE_KEY_FILE` (see
   "Bootstrap the host" below). One file, gitignored, for both toolchains —
   the `infra:tf:*` and `infra:ansible:*` scripts below both load it via
   `dotenv-cli`, so there's nothing to `export` by hand, no `-var=...`
   flags to repeat, and no `--ask-vault-pass` prompt.

## Provision the droplet (Terraform)

```bash
pnpm run infra:tf:init
pnpm run infra:tf:apply
```

(`infra:tf:init` already points at `../tenants/backend.prod.tfbackend`. For
a different tenant, don't pass extra flags through pnpm — see "Adding
another tenant" below for the direct `terraform -chdir=...` form instead.)

This also creates ap-connect's own two Spaces buckets — `attachments_bucket_name`
(defaults to `ap-connect-prod`, private chat uploads and public avatar objects) and
`backups_bucket_name` (defaults to `ap-connect-prod-backups`, always
private, nightly Postgres dumps). Two buckets, not one bucket with two
prefixes, so "backups must never be public" is a property of the bucket
rather than of every upload call remembering the right ACL. Read them back
with:

```bash
# Not `pnpm run infra:tf:output -- -raw <name>` — pnpm inserts its own `--`
# before yours, and terraform's CLI parser rejects the resulting double
# separator. Use dotenv-cli directly for anything needing extra flags:
pnpm exec dotenv -e infra/terraform/prod/.env -- terraform -chdir=infra/terraform/prod output -raw attachments_bucket_name
pnpm exec dotenv -e infra/terraform/prod/.env -- terraform -chdir=infra/terraform/prod output -raw backups_bucket_name
pnpm exec dotenv -e infra/terraform/prod/.env -- terraform -chdir=infra/terraform/prod output -raw spaces_region_endpoint
```

— and put those, plus the same Spaces key pair from step 3, into the vault
(`do_spaces_bucket`, `do_backups_bucket`, `do_spaces_endpoint`,
`do_spaces_access_key`, `do_spaces_secret_key`).

## Bootstrap the host (Ansible, one time)

One-time setup (in the same `infra/terraform/prod/.env` from step 6): set
`ANSIBLE_VAULT_PASSWORD_FILE` to a gitignored file holding the vault
password (`echo yourpassword > infra/ansible/.vault-pass && chmod 600
infra/ansible/.vault-pass`), and `ANSIBLE_PRIVATE_KEY_FILE` to your SSH
key. That removes `--ask-vault-pass` entirely — no `-e` needed for secrets.
A passphrase-protected key has no env var equivalent (ansible/ssh don't
accept passphrases that way by design); load it once per shell session
instead: `eval "$(ssh-agent)" && ssh-add ~/.ssh/id_ed25519`.

```bash
pnpm run infra:ansible:init
```

This hardens SSH, installs Docker, sets up ufw/fail2ban, and brings up the
compose stack and nightly Postgres backup for the first time.

## Build, push, deploy (repeat for every release)

```bash
# 1. Build and push both images from the repo root
cp web/.env.production.example web/.env.production  # once, then fill in
docker login ghcr.io -u <your-gh-username>
./infra/scripts/build-and-push.sh v2026.02.01

# 2. Point the host at the new tag and redeploy — app_tag isn't a secret
# and changes every release, so it stays an explicit flag rather than
# living in .env. Direct dotenv-cli, not the pnpm script: same -- passthrough
# issue as the terraform output example above.
cd infra/ansible
dotenv -e ../terraform/prod/.env -- ansible-playbook playbooks/deploy.yml -e app_tag=v2026.02.01
```

`compose_runtime` pulls both images, recreates the stack, and prunes
image layers nothing is using anymore. Database migrations run automatically
on API boot (Drizzle's migrator runs in `onModuleInit`) — there is no
separate migration step.

The build script targets `linux/amd64` for the default DigitalOcean droplet,
including builds from ARM Macs. Set `DOCKER_BUILD_PLATFORM` only when deploying
to a host with a different architecture.

## Production OIDC settings

For this tenant, `OIDC_ISSUER` in the backend vault and `VITE_OIDC_ISSUER`
in the release build environment are `https://api.ap-platform.online/accounts`.
This is the identity server's issuer, configured by `ACCOUNTS_ISSUER` in
backend-LMS and advertised in Accounts discovery. The Chats Caddyfile serves
`chats.ap-platform.online`; it does not determine the Accounts issuer.

`OIDC_AUDIENCE` and `VITE_OIDC_AUDIENCE` are
`https://chats.ap-platform.online`. Register the clients by running
`infra/scripts/register-production-oidc-clients.sql` in the production
**backend-LMS database**, which owns Accounts clients. The script inserts or
replaces the LMS web and Connect web/mobile settings, including logout callbacks. It uses
application ID `6e8c8a93-d26b-4f2d-8d40-8bc9f31f2b02`; that application must
already exist in production. For example, with `DATABASE_URL` pointing at
that database:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f infra/scripts/register-production-oidc-clients.sql
```

The LMS client is `lms-web`, with redirect URI
`https://ap-platform.online/auth/callback`, logout return to
`https://ap-platform.online` and resource `https://api.ap-platform.online`.
The Chats web client is `ap-chats-web`, with redirect URI
`https://chats.ap-platform.online/auth/callback` and logout return to
`https://chats.ap-platform.online`. The native client is `ap-connect-mobile`,
with `apchats://auth/callback` for both login and logout, matching
`mobile/app.json`. Its release settings are
`EXPO_PUBLIC_OIDC_ISSUER=https://api.ap-platform.online/accounts`,
`EXPO_PUBLIC_OIDC_CLIENT_ID=ap-connect-mobile` and
`EXPO_PUBLIC_OIDC_AUDIENCE=https://chats.ap-platform.online`.
Localhost and Expo Go callbacks are development settings.

The public `VITE_*` values are compiled into the web image at build time.
Backend settings come from the vault-backed runtime `app.env`. Updating
the server environment does not change an already built frontend. The build
script accepts exported release variables or the file selected by
`WEB_BUILD_ENV` (defaults to `web/.env.production`, also loaded by Vite for
local production builds).

Before releasing sign-in, verify Accounts discovery at
`https://api.ap-platform.online/accounts/.well-known/openid-configuration`:
the issuer must match and the authorization, token and JWKS endpoints must
use HTTPS. Proxy scheme handling belongs to the Accounts deployment.

## Calls and mobile VoIP push

Calls are implemented. The production stack needs an existing LiveKit Cloud
or self-hosted server; it does not create one. In the encrypted vault, set
`livekit_url` to that server's public `wss://` URL, plus `livekit_api_key`
and `livekit_api_secret`. The URL is returned in join grants, so browsers
and mobile clients must be able to reach it directly. Set all three values
or leave all empty; with no credentials, starting a call returns 503.

To wake a backgrounded mobile app for incoming calls, configure the
platform's provider independently:

- **iOS:** set `apns_key_id`, `apns_team_id`, `apns_private_key` and
  `apns_voip_topic` together. The topic is `<iOS bundle identifier>.voip`.
  Paste the full Apple `.p8` PEM into `apns_private_key: |-` with indented
  lines and real line breaks. The provider passes this directly to
  `jose.importPKCS8(..., 'ES256')`; a file path or literal `\n` text is not
  a PEM key.
- **Android:** set `fcm_project_id` and `fcm_service_account_json` together.
  Paste the full service account JSON into `fcm_service_account_json: |-`
  as an indented string block. Preserve the JSON's own `private_key`
  escapes; the provider runs `JSON.parse` before importing that key.

The env template quotes both strings for Compose, preserving PEM newlines,
JSON escapes and literal dollar signs. See the examples in
`ansible/inventory/group_vars/prod/vault.yml.example`. Omitted groups default
to empty values; incomplete groups fail application config validation.
Without APNs/FCM credentials, incoming call ringing only reaches mobile
clients with an active socket connection.

For an existing deployment, add the new fields using `ansible-vault edit`,
then run the deploy playbook with the currently deployed `app_tag` as shown
above. This renders `app.env` and recreates the API container with the new
environment. Changing the example file alone does not update an existing
encrypted vault. Native builds also need their corresponding push setup
and registered device tokens.

## Queued push delivery

The `PUSH_*`, Expo and Web Push settings are prepared for
`feat/chat-push-notifications`; they are not consumed by `origin/main` at
`fbec3fc`. Deploying main alone does not enable queued notifications.
After that feature is merged and its migrations are reconciled with main's
attachment migrations, build new images and set `push_enabled: true` in
`ansible/inventory/group_vars/prod/vars.yml`. Keep `push_worker_enabled: true`
on this single API instance: it runs both the outbox dispatcher and delivery
workers, including incoming call pushes in the new implementation.

Valkey runs on the private Compose network with an AOF volume and
`noeviction`, with no published host port. The API uses
`redis://valkey:6379/0`; the local development URL
`redis://127.0.0.1:6380/0` cannot reach this container. Queue timing,
rate limits and worker concurrency have defaults in `compose_runtime` and
can be overridden in group vars. Ordinary native notifications use Expo
(`expo_access_token` is optional unless enhanced Expo security is enabled).
Browser push needs all three `web_push_*` vault fields, one persistent VAPID
pair and the web image's public service worker assets. The web Dockerfile
copies the entire web source, including `public/` when it is present.

## Chat attachments and web build settings

The main branch's private multipart attachments require exact-origin
Spaces CORS for `PUT`, `GET` and `HEAD`. Terraform configures that on the
attachments bucket for `https://<chats_subdomain>.<domain_name>`, plus a
one-day abort rule for unfinished uploads under `chat-attachments/`.
If `domain_name` is null or the web origin differs, configure the matching
origins before deploying clients. Apply the Terraform change before the
application release; the Ansible deploy alone does not update bucket CORS.
Completed chat objects stay private and are retained according to live
message references, not a storage age-based deletion rule.

`CHAT_UPLOAD_MAX_*` limits are rendered into `app.env`, including the pending
reservation caps. Defaults match `.env.example` for the three public limits
and the config schema for the pending limits. See `docs/chat-uploads.md`
for the full storage permission and migration requirements.

Set `VITE_TENOR_API_KEY` in `web/.env.production` to enable GIF search.
Like the OIDC and image URL settings, it is baked into the web image and
requires rebuilding that image when changed. The root `.dockerignore`
excludes local dependency trees and deploy credentials from both build contexts.

## Running this from a different machine

Nothing here is tied to one developer's laptop — state (Backblaze B2),
secrets (`vault.yml`, gitignored but re-creatable from the example +
whoever holds the password), and the provider version
(`terraform/prod/.terraform.lock.hcl`, committed) are all shared or
reproducible. From a fresh clone, anyone with the right credentials gets:

1. `ansible-galaxy collection install -r infra/ansible/requirements.yml -p infra/ansible/collections` —
   collections are gitignored on purpose (only `ap_education.connect_deploy`
   itself is vendored), so this has to be re-run on every machine.
2. The same four credentials as before: `TF_VAR_do_token` (the **ap-main**
   team's, not a different DO team/project), the Backblaze B2 key pair for
   `ap-lms`, the ap-connect DigitalOcean Spaces key, and the
   `ansible-vault` password for `vault.yml`.
3. An SSH private key matching one of the `ssh_key_ids` already authorized
   on the droplet — a different machine needs its _own_ keypair registered
   the same way, or a copy of an already-authorized one.

`terraform.lock.hcl` being committed matters here specifically: without
it, a `terraform init` run from a different machine (or just run later)
could resolve a different patch version of the DigitalOcean provider than
whatever last applied this state — usually harmless, occasionally not.
Committing it pins everyone to the exact version+checksums already tested.

**One real safety gap, inherited from matching backend-LMS's setup, not
introduced by ap-connect specifically:** the Backblaze B2 state backend has
no working state lock. Terraform 1.11+'s native S3-style locking
(`use_lockfile`) needs `If-None-Match` conditional writes, which
Backblaze's S3-compatible API doesn't support — so this isn't set, and
wouldn't reliably do anything if it were. In practice: **don't run
`terraform apply` against `chats/prod/terraform.tfstate` from two places at
once.** It's a process rule, not something the tooling enforces for you.
This is also just... what backend-LMS itself already lives with, not a new
risk this introduces.

## Adding another tenant

Everything above is parameterized by tenant already:

1. Copy `terraform/tenants/backend.sample.tfbackend` to
   `backend.<tenant>.tfbackend` with its own state key.
2. `terraform -chdir=infra/terraform/prod init -backend-config=../tenants/backend.<tenant>.tfbackend -reconfigure`,
   then `apply` with that tenant's vars (own domain/subdomain, SSH CIDRs, etc).
3. Add `ansible/inventory/<tenant>_inventory.py` (copy `prod_inventory.py`,
   point it at the tenant's terraform workdir, group hosts under the tenant
   slug) and `ansible/inventory/group_vars/<tenant>/` for its secrets.
4. Run the same `init.yml` / `deploy.yml` playbooks with
   `-i inventory/<tenant>_inventory.py`.

This mirrors backend-LMS's per-tenant `.tfbackend` convention, minus the
shared observability host — bolt `metrics_exporters`-style shipping onto
LMS's existing ops host later if/when this needs the same treatment.

## Design choices worth knowing

- **No load balancer, no managed Postgres/Valkey.** One instance, Postgres
  and Valkey as containers with volumes, nightly `pg_dump` to DO Spaces. Swapping in a managed Postgres
  later only means changing `DATABASE_URL`, not application code. The backup
  script only ever uploads — Terraform's `spaces_backup_retention_days`
  (default 30) is what actually expires old backups, via a lifecycle rule on
  the backups bucket's `backups/` prefix.
- **Two Spaces buckets, own key — neither shared with backend-LMS.**
  `attachments_bucket_name` (default `ap-connect-prod`) holds private chat
  uploads with signed downloads and public-read avatar objects.
  `backups_bucket_name` (default `ap-connect-prod-backups`) holds
  nightly pg_dump dumps and stays private — its default ACL is never
  touched. Deliberately two buckets, not one bucket with two prefixes: that
  way "backups must never be public" is a property of the bucket, not of
  every upload call remembering the right ACL. One Spaces key pair manages
  (and is used by) both — DO Spaces keys can be scoped to specific buckets,
  so this one doesn't need to reach anything outside these two — but
  either way it's ap-connect's own, not reused from backend-LMS.
- **Caddy, not nginx+certbot**, as the edge: automatic HTTPS (no DO Load
  Balancer to terminate TLS), and it serves the SPA's static build directly
  in addition to reverse-proxying `/api` and `/socket.io` — no third
  "static file server" container needed.
- **LiveKit is external to this stack.** Calls use the optional vault
  credentials described above. Self-hosting on this droplet would also
  require a LiveKit service, public TLS endpoint and media/TURN ports in
  both firewall layers; setting env vars alone does not provision those.
- **Secrets via Ansible Vault**, not Doppler — this is a small, single-env
  side app; a vault-encrypted vars file avoids a third-party dependency and
  keeps deploys fully offline-capable. Revisit if this grows enough tenants
  that secret rotation/audit across them gets painful.
