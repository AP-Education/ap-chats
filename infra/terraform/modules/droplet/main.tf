terraform {
  required_version = ">= 1.5.0"

  required_providers {
    digitalocean = {
      source = "digitalocean/digitalocean"
    }
  }
}

resource "digitalocean_droplet" "this" {
  name   = var.name
  region = var.region
  size   = var.size
  image  = var.image

  vpc_uuid   = var.vpc_id
  monitoring = var.monitoring
  backups    = var.backups

  ssh_keys = var.ssh_keys
  tags     = var.tags

  user_data = var.user_data

  lifecycle {
    create_before_destroy = true
  }

  timeouts {
    delete = "10m"
  }
}

output "id" {
  description = "Droplet ID."
  value       = digitalocean_droplet.this.id
}

output "public_ipv4" {
  description = "Public IPv4 address."
  value       = digitalocean_droplet.this.ipv4_address
}

output "private_ipv4" {
  description = "Private IPv4 address (only populated once the droplet is in a VPC)."
  value       = digitalocean_droplet.this.ipv4_address_private
}
