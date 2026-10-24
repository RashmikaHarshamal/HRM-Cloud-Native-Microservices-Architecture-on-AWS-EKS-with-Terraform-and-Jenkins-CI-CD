resource "aws_ecr_repository" "svc" {
  for_each = toset([
    "user-service",
    "hr-service",
    "employee-service",
    "admin-service",
    "frontend"
  ])

  name                 = "hrm/${each.key}"
  image_tag_mutability = "IMMUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }
}