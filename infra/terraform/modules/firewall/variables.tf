variable "name" {
  description = "Firewall name."
  type        = string
}

variable "droplet_ids" {
  description = "List of droplet IDs to attach the firewall to."
  type        = list(string)
}

variable "allowed_ssh_sources" {
  description = "CIDR blocks allowed to SSH (port 22)."
  type        = list(string)
}

variable "allowed_http_sources" {
  description = "CIDR blocks allowed to reach HTTP (port 80). Defaults to the whole internet."
  type        = list(string)
  default     = ["0.0.0.0/0", "::/0"]
}

variable "allowed_https_sources" {
  description = "CIDR blocks allowed to reach HTTPS (port 443). Defaults to the whole internet."
  type        = list(string)
  default     = ["0.0.0.0/0", "::/0"]
}

variable "vpc_cidr" {
  description = "CIDR of the attached VPC, for intra-VPC traffic. Leave null when the droplet is not joined to a shared VPC."
  type        = string
  default     = null
}
