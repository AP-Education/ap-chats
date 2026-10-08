terraform {
  backend "s3" {
    # Filled in via -backend-config=../tenants/backend.<tenant>.tfbackend
  }
}
