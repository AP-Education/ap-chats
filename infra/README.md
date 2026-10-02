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
   `terraform/tenants/backend.prod.tfbackend` and fill in your DO Spaces
   bucket/region (gitignored — holds no secrets itself, but is
   environment-specific).
3. **DigitalOcean Spaces key**: create a Spaces access key dedicated to
   ap-connect — DO dashboard → API → Spaces Keys → "Generate New Key". Don't
   reuse backend-LMS's key: Spaces keys are account-wide (not scoped to one
   bucket), so a project of its own keeps rotation and blast radius
   independent. You'll use this same key pair twice: once below to let
   Terraform create the bucket, and once in the vault (step 4) for the app
   itself to read/write objects in it.
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
export AWS_ACCESS_KEY_ID=...      # DO Spaces key, for the *state backend* bucket
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

This also creates ap-connect's own Spaces bucket (`spaces_bucket_name`,
defaults to `ap-connect-prod`). Read its name/endpoint back with:

```bash
terraform -chdir=infra/terraform/prod output -raw spaces_bucket_name
terraform -chdir=infra/terraform/prod output -raw spaces_bucket_endpoint
```

— and put those, plus the same Spaces key pair from step 3, into the vault
(`do_spaces_bucket`, `do_spaces_endpoint`, `do_spaces_access_key`,
`do_spaces_secret_key`).

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
  later only means changing `DATABASE_URL`, not application code. Set a
  lifecycle rule on the Spaces bucket's `ap-connect/backups/` prefix to
  expire old backups — this doesn't prune them itself.
- **Own Spaces bucket, own key — not shared with backend-LMS.** Terraform
  creates it (`spaces_bucket_name`, default `ap-connect-prod`) and its
  default ACL stays private; the app sets `ACL: public-read` per object on
  upload (`DigitalOceanSpacesProvider.uploadObject`), so chat images end up
  individually public while the nightly pg_dump backup — written without
  that flag — stays private in the same bucket. No bucket-level public
  policy or CORS config needed for that reason.
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
