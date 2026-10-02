variable "do_token" {
  description = "DigitalOcean API token. Prefer the DIGITALOCEAN_TOKEN env var over setting this directly."
  type        = string
  default     = null
  sensitive   = true
}

provider "digitalocean" {
  token = var.do_token

  # Needed to manage the Spaces bucket below — Spaces' API is S3-compatible
  # and authenticates separately from the main DO API token.
  spaces_access_id  = var.spaces_access_key_id
  spaces_secret_key = var.spaces_secret_access_key
}
