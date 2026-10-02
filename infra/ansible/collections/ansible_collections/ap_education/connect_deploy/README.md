# ap_education.connect_deploy

Roles for provisioning and deploying the AP Chats single-instance stack (Postgres + API + Caddy edge, all on one droplet).

Run `ansible-doc -t role ap_education.connect_deploy.<role>` for each role's documented variables (see each role's `meta/argument_specs.yml`).

| Role              | Purpose                                                                     |
| ----------------- | --------------------------------------------------------------------------- |
| `base`            | Common packages, unattended upgrades, app directory                         |
| `sshd_hardening`  | Disable password/root SSH login                                             |
| `ufw`             | Default-deny firewall, open 22/80/443                                       |
| `fail2ban`        | Ban repeat SSH offenders                                                    |
| `docker_engine`   | Install Docker CE + Compose plugin                                          |
| `compose_runtime` | Render and run the app's docker-compose stack from GHCR                     |
| `postgres_backup` | Nightly `pg_dump` of the in-stack Postgres container to DigitalOcean Spaces |

See `infra/README.md` at the repo root for the end-to-end manual deploy runbook.
