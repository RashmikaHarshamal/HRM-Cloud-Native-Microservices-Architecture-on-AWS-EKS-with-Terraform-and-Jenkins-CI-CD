output "cluster_name" {
  value = module.eks.cluster_name
}

output "rds_endpoint" {
  value = aws_db_instance.hrm.address
}

output "rds_secret_arn" {
  value = aws_db_instance.hrm.master_user_secret[0].secret_arn
}

output "ecr_urls" {
  value = {
    for name, repository in aws_ecr_repository.svc :
    name => repository.repository_url
  }
}