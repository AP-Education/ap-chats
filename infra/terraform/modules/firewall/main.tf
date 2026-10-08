terraform {
  required_version = ">= 1.5.0"

  required_providers {
    digitalocean = {
      source = "digitalocean/digitalocean"
    }
  }
}

resource "digitalocean_firewall" "this" {
  name = var.name

  droplet_ids = var.droplet_ids

  dynamic "inbound_rule" {
    for_each = var.allowed_ssh_sources
    content {
      protocol         = "tcp"
      port_range       = "22"
      source_addresses = [inbound_rule.value]
    }
  }

  dynamic "inbound_rule" {
    for_each = var.allowed_http_sources
    content {
      protocol         = "tcp"
      port_range       = "80"
      source_addresses = [inbound_rule.value]
    }
  }

  dynamic "inbound_rule" {
    for_each = var.allowed_https_sources
    content {
      protocol         = "tcp"
      port_range       = "443"
      source_addresses = [inbound_rule.value]
    }
  }

  dynamic "inbound_rule" {
    for_each = var.vpc_cidr != null ? ["tcp", "udp"] : []
    content {
      protocol         = inbound_rule.value
      port_range       = "1-65535"
      source_addresses = [var.vpc_cidr]
    }
  }

  dynamic "inbound_rule" {
    for_each = var.vpc_cidr != null ? [var.vpc_cidr] : []
    content {
      protocol         = "icmp"
      source_addresses = [inbound_rule.value]
    }
  }

  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}

output "id" {
  description = "Firewall ID."
  value       = digitalocean_firewall.this.id
}
