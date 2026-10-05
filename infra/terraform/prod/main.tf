locals {
  project_slug = replace(lower(var.project_name), "_", "-")
  env_slug     = replace(lower(var.environment), "_", "-")
  base_prefix  = "${local.project_slug}-${local.env_slug}"

  common_tags = [
    "project-${local.project_slug}",
    "env-${local.env_slug}",
    local.base_prefix,
  ]

  domain_fqdn = var.domain_name != null ? "${var.chats_subdomain}.${var.domain_name}" : null

  # Two buckets, not one with two prefixes: attachments get ACL=public-read
  # per object from the app, backups never do — a dedicated bucket means
  # that split doesn't depend on every code path getting its ACL right.
  attachments_bucket_name = coalesce(var.attachments_bucket_name, local.base_prefix)
  backups_bucket_name     = coalesce(var.backups_bucket_name, "${local.base_prefix}-backups")
  spaces_region_endpoint  = "https://${var.spaces_region}.digitaloceanspaces.com"

  cloud_init = templatefile("${path.module}/../../cloud-init/prod.yaml", {
    runner_user         = var.runner_user
    ssh_authorized_keys = var.ssh_authorized_keys
    project_name        = var.project_name
    environment         = var.environment
  })
}

# Only looked up when vpc_id is set, so the firewall can still open the
# intra-VPC rule for a shared (e.g. backend-LMS) VPC without requiring one.
data "digitalocean_vpc" "shared" {
  count = var.vpc_id != null ? 1 : 0
  id    = var.vpc_id
}

module "web" {
  source = "../modules/droplet"

  name   = "${local.base_prefix}-web"
  region = var.region
  size   = var.droplet_size
  image  = var.droplet_image

  vpc_id   = var.vpc_id
  ssh_keys = var.ssh_key_ids

  user_data = local.cloud_init
  tags      = local.common_tags
}

module "attachments" {
  source = "../modules/spaces"

  name          = local.attachments_bucket_name
  region        = var.spaces_region
  force_destroy = var.spaces_force_destroy
}

module "backups" {
  source = "../modules/spaces"

  name          = local.backups_bucket_name
  region        = var.spaces_region
  force_destroy = var.spaces_force_destroy

  # Matches the object key postgres_backup's template writes
  # ("backups/...") — keep the two in sync if either changes.
  expiration_prefix = "backups/"
  expiration_days   = var.spaces_backup_retention_days
}

module "firewall" {
  source = "../modules/firewall"

  name        = "${local.base_prefix}-firewall"
  droplet_ids = [module.web.id]

  allowed_ssh_sources = var.allowed_ssh_cidrs
  vpc_cidr            = var.vpc_id != null ? data.digitalocean_vpc.shared[0].ip_range : null
}

resource "digitalocean_domain" "primary" {
  count = var.domain_name != null && var.manage_domain ? 1 : 0

  name = var.domain_name
}

resource "digitalocean_record" "chats" {
  count = var.domain_name != null && var.enable_dns ? 1 : 0

  domain = var.domain_name
  type   = "A"
  name   = var.chats_subdomain
  value  = module.web.public_ipv4
  ttl    = 300

  depends_on = [digitalocean_domain.primary]
}
