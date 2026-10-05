# ap-connect deploy

Single droplet, no load balancer. Postgres, the API and a Caddy edge (static
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
5. **Ansible collections**:
   ```bash
   ansible-galaxy collection install -r infra/ansible/requirements.yml -p infra/ansible/collections
   ```

## Provision the droplet (Terraform)

```bash
export DIGITALOCEAN_TOKEN=...
export AWS_ACCESS_KEY_ID=...      # Backblaze B2 application key ID (ap-lms bucket) — NOT the DO Spaces key from step 3
export AWS_SECRET_ACCESS_KEY=...

terraform -chdir=infra/terraform/prod init \
  -backend-config=../tenants/backend.prod.tfbackend

terraform -chdir=infra/terraform/prod apply \
  -var='allowed_ssh_cidrs=["<your IP>/32"]' \
  -var='ssh_key_ids=["<DO SSH key fingerprint or ID>"]' \
  -var='spaces_access_key_id=<the ap-connect Spaces key from step 3>' \
  -var='spaces_secret_access_key=<its secret>'
  # add -var='vpc_id=<existing VPC id>' to join a shared VPC (optional)
```

This also creates ap-connect's own two Spaces buckets — `attachments_bucket_name`
(defaults to `ap-connect-prod`, public-read per object, chat uploads) and
`backups_bucket_name` (defaults to `ap-connect-prod-backups`, always
private, nightly Postgres dumps). Two buckets, not one bucket with two
prefixes, so "backups must never be public" is a property of the bucket
rather than of every upload call remembering the right ACL. Read them back
with:

```bash
terraform -chdir=infra/terraform/prod output -raw attachments_bucket_name
terraform -chdir=infra/terraform/prod output -raw backups_bucket_name
terraform -chdir=infra/terraform/prod output -raw spaces_region_endpoint
```

— and put those, plus the same Spaces key pair from step 3, into the vault
(`do_spaces_bucket`, `do_backups_bucket`, `do_spaces_endpoint`,
`do_spaces_access_key`, `do_spaces_secret_key`).

## Bootstrap the host (Ansible, one time)

```bash
cd infra/ansible
ansible-playbook playbooks/init.yml --ask-vault-pass
```

This hardens SSH, installs Docker, sets up ufw/fail2ban, and brings up the
compose stack and nightly Postgres backup for the first time.

## Build, push, deploy (repeat for every release)

```bash
# 1. Build and push both images from the repo root
cp infra/docker/web-build.env.example infra/docker/web-build.env  # once, then fill in
docker login ghcr.io -u <your-gh-username>
./infra/scripts/build-and-push.sh v2026.02.01

# 2. Point the host at the new tag and redeploy
cd infra/ansible
ansible-playbook playbooks/deploy.yml --ask-vault-pass -e app_tag=v2026.02.01
```

`compose_runtime` pulls both images, recreates the stack, and prunes
image layers nothing is using anymore. Database migrations run automatically
on API boot (Drizzle's migrator runs in `onModuleInit`) — there is no
separate migration step.

## Running this from a different machine

Nothing here is tied to one developer's laptop — state (Backblaze B2),
secrets (`vault.yml`, gitignored but re-creatable from the example +
whoever holds the password), and the provider version
(`terraform/prod/.terraform.lock.hcl`, committed) are all shared or
reproducible. From a fresh clone, anyone with the right credentials gets:

1. `ansible-galaxy collection install -r infra/ansible/requirements.yml -p infra/ansible/collections` —
   collections are gitignored on purpose (only `ap_education.connect_deploy`
   itself is vendored), so this has to be re-run on every machine.
2. The same four credentials as before: `DIGITALOCEAN_TOKEN` (the **ap-main**
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
  as a container with a volume, nightly `pg_dump` to DO Spaces. Cheaper and
  simpler for the current (scaffold) stage; swapping in a managed Postgres
  later only means changing `DATABASE_URL`, not application code. The backup
  script only ever uploads — Terraform's `spaces_backup_retention_days`
  (default 30) is what actually expires old backups, via a lifecycle rule on
  the backups bucket's `backups/` prefix.
- **Two Spaces buckets, own key — neither shared with backend-LMS.**
  `attachments_bucket_name` (default `ap-connect-prod`) holds chat uploads;
  the app sets `ACL: public-read` per object on upload
  (`DigitalOceanSpacesProvider.uploadObject`), so those end up individually
  public. `backups_bucket_name` (default `ap-connect-prod-backups`) holds
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
- **LiveKit isn't deployed yet** — calls aren't implemented in the app yet
  either (`LIVEKIT_*` env vars are optional in `config.schema.ts`). Add a
  `livekit` service to the compose template (and open its ports in the
  firewall module) when that's ready; self-hosted vs. LiveKit Cloud is a
  separate decision at that point.
- **Secrets via Ansible Vault**, not Doppler — this is a small, single-env
  side app; a vault-encrypted vars file avoids a third-party dependency and
  keeps deploys fully offline-capable. Revisit if this grows enough tenants
  that secret rotation/audit across them gets painful.
