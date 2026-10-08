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

variable "cors_allowed_origins" {
  description = "Exact web origins allowed to upload/download attachments directly. Empty disables CORS."
  type        = list(string)
  default     = []
}

variable "abort_multipart_prefix" {
  description = "Prefix whose incomplete multipart uploads are aborted after one day. Null disables the rule."
  type        = string
  default     = null
}

variable "expiration_prefix" {
  description = "Object key prefix to auto-expire (e.g. where nightly backups are written). Leave null to skip creating a lifecycle rule entirely."
  type        = string
  default     = null
}

variable "expiration_days" {
  description = "Delete objects under expiration_prefix this many days after creation."
  type        = number
  default     = 30
}
