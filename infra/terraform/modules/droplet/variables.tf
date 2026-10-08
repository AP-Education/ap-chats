variable "name" {
  description = "Droplet name."
  type        = string
}

variable "region" {
  description = "DigitalOcean region slug."
  type        = string
}

variable "size" {
  description = "Droplet size slug (e.g. s-2vcpu-4gb)."
  type        = string
}

variable "image" {
  description = "Image slug or ID to use for the droplet."
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC to attach the droplet to. Leave null to use the region's default VPC."
  type        = string
  default     = null
}

variable "ssh_keys" {
  description = "List of SSH key IDs or fingerprints to attach to the droplet."
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "List of tags to apply to the droplet."
  type        = list(string)
  default     = []
}

variable "user_data" {
  description = "Optional cloud-init / user-data script."
  type        = string
  default     = null
}

variable "backups" {
  description = "Enable DigitalOcean automatic backups."
  type        = bool
  default     = false
}

variable "monitoring" {
  description = "Enable DigitalOcean monitoring agent."
  type        = bool
  default     = true
}
