resource "aws_db_subnet_group" "hrm" {
  name       = "hrm-prod"
  subnet_ids = module.vpc.database_subnets
}

resource "aws_security_group" "rds" {
  name        = "hrm-rds"
  description = "Allow PostgreSQL from EKS worker nodes"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description     = "PostgreSQL from EKS nodes"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]
  }
}

resource "aws_db_instance" "hrm" {
  identifier = "hrm-prod"

  engine         = "postgres"
  engine_version = "16"
  instance_class = "db.t4g.medium"

  allocated_storage     = 50
  max_allocated_storage = 200
  storage_type          = "gp3"
  storage_encrypted     = true

  username                    = "hrm_admin"
  manage_master_user_password = true

  db_subnet_group_name   = aws_db_subnet_group.hrm.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  publicly_accessible = false
  multi_az            = false

  backup_retention_period = 7

  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "hrm-prod-final"
}