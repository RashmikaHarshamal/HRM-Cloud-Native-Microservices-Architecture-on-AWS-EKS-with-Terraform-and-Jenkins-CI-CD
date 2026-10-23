terraform {
  backend "s3" {
    bucket       = "hrm-terraform-state-734329327187-ap-southeast-1"
    key          = "prod/terraform.tfstate"
    region       = "ap-southeast-1"
    encrypt      = true
    use_lockfile = true
  }
}