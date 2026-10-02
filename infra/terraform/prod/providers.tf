variable "do_token" {
  description = "DigitalOcean API token. Prefer the DIGITALOCEAN_TOKEN env var over setting this directly."
  type        = string
  default     = null
  sensitive   = true
}

provider "digitalocean" {
  token = var.do_token
}
