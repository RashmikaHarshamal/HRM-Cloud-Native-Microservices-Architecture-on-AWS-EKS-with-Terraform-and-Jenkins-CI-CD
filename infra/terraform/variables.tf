variable "kubernetes_version" {
  description = "An EKS Kubernetes version currently in standard support"
  type        = string
}

variable "admin_public_cidr" {
  description = "Your current public IPv4 address with /32"
  type        = string
}