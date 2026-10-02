variable "name" {
  description = "Spaces bucket name."
  type        = string
}

variable "region" {
  description = "Region slug for the bucket."
  type        = string
}

variable "force_destroy" {
  description = "Whether to allow destroying the bucket even if it still has objects in it."
  type        = bool
  default     = false
}
