variable "project_name" {
  description = "Project slug used to prefix resource names."
  type        = string
  default     = "ap-connect"
}

variable "environment" {
  description = "Environment / tenant slug (e.g. prod, stage, a customer name)."
  type        = string
  default     = "prod"
}

variable "region" {
  description = "DigitalOcean region slug."
  type        = string
  default     = "fra1"
}

variable "droplet_size" {
  description = "Droplet size slug. One instance runs Postgres, the API and the edge proxy together."
  type        = string
  default     = "s-2vcpu-4gb"
}

variable "droplet_image" {
  description = "Base image slug for the droplet."
  type        = string
  default     = "ubuntu-24-04-x64"
}

variable "vpc_id" {
  description = <<-EOT
    ID of an existing (e.g. backend-LMS) VPC to join the droplet to, for direct
    private networking with other services. Leave null to use the region's
    default VPC — joining a shared VPC is optional, not required.
  EOT
  type        = string
  default     = null
}

variable "ssh_key_ids" {
  description = "DigitalOcean SSH key IDs or fingerprints to pre-authorize on the droplet."
  type        = list(string)
  default     = []
}

variable "runner_user" {
  description = "Non-root sudo user created by cloud-init; Ansible connects as this user."
  type        = string
  default     = "runner"
}

variable "ssh_authorized_keys" {
  description = "Public keys authorized for runner_user via cloud-init."
  type        = list(string)
  default     = []
}

variable "allowed_ssh_cidrs" {
  description = "CIDR blocks allowed to SSH into the droplet. Keep this narrow (office/VPN egress IPs)."
  type        = list(string)
}

variable "domain_name" {
  description = "Base domain that the chats subdomain is created under (e.g. ap-platform.online). Set to null to skip DNS entirely."
  type        = string
  default     = "ap-platform.online"
}

variable "chats_subdomain" {
  description = "Subdomain the app is served on, under domain_name."
  type        = string
  default     = "chats"
}

variable "manage_domain" {
  description = "Whether Terraform should own the DigitalOcean domain zone itself. Set false if the zone is already managed elsewhere (e.g. by backend-LMS's Terraform) and this root should only add its own record."
  type        = bool
  default     = false
}

variable "enable_dns" {
  description = "Whether to create the chats subdomain A record at all."
  type        = bool
  default     = true
}
