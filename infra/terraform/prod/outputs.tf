output "web_droplet_name" {
  value = "${local.base_prefix}-web"
}

output "web_droplet_public_ip" {
  value = module.web.public_ipv4
}

output "web_droplet_private_ip" {
  value = module.web.private_ipv4
}

output "reserved_ip" {
  description = "Public address of the host; DNS points here."
  value       = digitalocean_reserved_ip.web.ip_address
}

output "data_volume_name" {
  description = "Block storage holding Postgres, Valkey and Caddy state; Ansible mounts it by this name."
  value       = digitalocean_volume.data.name
}

output "vpc_cidr" {
  value = var.vpc_id != null ? data.digitalocean_vpc.shared[0].ip_range : null
}

output "chats_fqdn" {
  value = local.domain_fqdn
}

output "attachments_bucket_name" {
  description = "Feed into do_spaces_bucket in the Ansible vault."
  value       = module.attachments.name
}

output "backups_bucket_name" {
  description = "Feed into do_backups_bucket in the Ansible vault."
  value       = module.backups.name
}

output "spaces_region_endpoint" {
  description = <<-EOT
    Feed into do_spaces_endpoint in the Ansible vault, used for both
    buckets. Deliberately the bare region endpoint, not either bucket's own
    <bucket>.<region>.digitaloceanspaces.com domain — the backup script's
    `aws s3 cp --endpoint-url` breaks if given a bucket-qualified one.
  EOT
  value       = local.spaces_region_endpoint
}
