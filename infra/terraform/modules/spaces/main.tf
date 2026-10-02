terraform {
  required_version = ">= 1.5.0"

  required_providers {
    digitalocean = {
      source = "digitalocean/digitalocean"
    }
  }
}

# Bucket default ACL stays "private" (the provider's default — not set here).
# The app sets ACL=public-read per object on upload (see
# DigitalOceanSpacesProvider.uploadObject), so chat images end up public
# individually while anything written without that flag — the nightly
# pg_dump backup included — stays private by default.
resource "digitalocean_spaces_bucket" "this" {
  name   = var.name
  region = var.region

  force_destroy = var.force_destroy
}

output "urn" {
  description = "URN of the Spaces bucket."
  value       = digitalocean_spaces_bucket.this.urn
}

output "name" {
  description = "Name of the Spaces bucket."
  value       = digitalocean_spaces_bucket.this.name
}

output "endpoint" {
  description = "Endpoint host of the bucket (<name>.<region>.digitaloceanspaces.com)."
  value       = digitalocean_spaces_bucket.this.bucket_domain_name
}
