resource "aws_ecr_repository" "svc" {
  for_each = toset([
    "user-service",
    "hr-service",
    "employee-service",
    "admin-service"
  ])

  name                 = "hrm/${each.key}"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}