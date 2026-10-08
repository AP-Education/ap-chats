variable "do_token" {
  description = "DigitalOcean API token. Set via the TF_VAR_do_token env var, not DIGITALOCEAN_TOKEN — matches backend-LMS's own terraform (its CI wires the same name from a Doppler secret)."
  type        = string
  sensitive   = true
}

variable "spaces_access_key_id" {
  description = <<-EOT
    DigitalOcean Spaces access key ID, dedicated to ap-connect (create one in
    the DO dashboard under API > Spaces Keys — don't reuse backend-LMS's
    key). Set via TF_VAR_spaces_access_key_id. Required both to let
    Terraform manage the two buckets and, later, for the app/backup script
    to read and write objects in them.
  EOT
  type        = string
  sensitive   = true
}

variable "spaces_secret_access_key" {
  description = "Secret half of spaces_access_key_id. Set via TF_VAR_spaces_secret_access_key."
  type        = string
  sensitive   = true
}

provider "digitalocean" {
  token = var.do_token

  # Spaces' API is S3-compatible and authenticates separately from the
  # main DO API token.
  spaces_access_id  = var.spaces_access_key_id
  spaces_secret_key = var.spaces_secret_access_key
}
