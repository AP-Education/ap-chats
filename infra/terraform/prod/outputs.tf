output "web_droplet_name" {
  value = "${local.base_prefix}-web"
}

output "web_droplet_public_ip" {
  value = module.web.public_ipv4
}

output "web_droplet_private_ip" {
  value = module.web.private_ipv4
}

output "vpc_cidr" {
  value = var.vpc_id != null ? data.digitalocean_vpc.shared[0].ip_range : null
}

output "chats_fqdn" {
  value = local.domain_fqdn
}

output "spaces_bucket_name" {
  value = module.spaces.name
}

output "spaces_bucket_endpoint" {
  description = "Feed into do_spaces_endpoint in the Ansible vault, as https://<this>."
  value       = module.spaces.endpoint
}
