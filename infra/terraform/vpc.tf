module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "hrm-prod"
  cidr = "10.20.0.0/16"

  azs = [
    "ap-southeast-1a",
    "ap-southeast-1b"
  ]

  public_subnets = [
    "10.20.1.0/24",
    "10.20.2.0/24"
  ]

  private_subnets = [
    "10.20.11.0/24",
    "10.20.12.0/24"
  ]

  database_subnets = [
    "10.20.21.0/24",
    "10.20.22.0/24"
  ]

  enable_dns_support   = true
  enable_dns_hostnames = true

  enable_nat_gateway = true
  single_nat_gateway = true

  create_database_subnet_group = false

  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
  }
}