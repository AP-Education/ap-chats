terraform {
  required_version = ">= 1.5.0"

  required_providers {
    digitalocean = {
      source = "digitalocean/digitalocean"
    }
  }
}

# Bucket default ACL stays "private" (the provider's default — not set here).
# Avatar uploads set ACL=public-read per object. Chat multipart attachments
# and nightly pg_dump backups stay private; chat downloads use signed URLs.
resource "digitalocean_spaces_bucket" "this" {
  name   = var.name
  region = var.region

  force_destroy = var.force_destroy

  dynamic "cors_rule" {
    for_each = length(var.cors_allowed_origins) > 0 ? [1] : []
    content {
      allowed_origins = var.cors_allowed_origins
      allowed_methods = ["PUT", "GET", "HEAD"]
      allowed_headers = ["Content-Type", "Range"]
      max_age_seconds = 3600
    }
  }

  dynamic "lifecycle_rule" {
    for_each = var.abort_multipart_prefix != null ? [1] : []
    content {
      id                                     = "abort-incomplete-chat-uploads"
      enabled                                = true
      prefix                                 = var.abort_multipart_prefix
      abort_incomplete_multipart_upload_days = 1
    }
  }

  # Nothing ever prunes objects on its own otherwise — the backup script
  # only ever uploads, it never deletes anything itself.
  dynamic "lifecycle_rule" {
    for_each = var.expiration_prefix != null ? [1] : []
    content {
      id      = "expire-${var.expiration_prefix}"
      enabled = true
      prefix  = var.expiration_prefix

      expiration {
        days = var.expiration_days
      }
    }
  }
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
