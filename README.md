# HRM Cloud-Native Microservices Architecture on AWS (EKS) with Terraform and Jenkins CI/CD

This repository provides a minimal cloud-native baseline for deploying an HRM microservice workload on **AWS EKS** using **Terraform** for infrastructure provisioning and **Jenkins** for CI/CD automation.

## Architecture Overview

- **Terraform** provisions:
  - VPC (public/private subnets, NAT)
  - EKS cluster and managed node group
- **Kubernetes manifests** deploy:
  - `hrm-service` Deployment
  - `hrm-service` Service
- **Jenkins pipeline** automates:
  - Terraform formatting and validation
  - Container image build
  - Optional image push to ECR
  - Optional deployment to EKS

## Repository Structure

- `terraform/` – Terraform configuration for AWS networking and EKS
- `k8s/` – Kubernetes namespace/deployment/service manifests
- `Jenkinsfile` – CI/CD pipeline stages for validate/build/push/deploy

## Quick Start

### 1. Validate Terraform

```bash
terraform -chdir=terraform init -backend=false
terraform -chdir=terraform validate
```

### 2. Deploy Infrastructure (example)

```bash
terraform -chdir=terraform plan -out tfplan
terraform -chdir=terraform apply tfplan
```

### 3. Deploy Manifests

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

## Jenkins CI/CD Notes

The pipeline expects the following environment variables for optional deployment stages:

- `ECR_REGISTRY` – ECR registry URI (enables image push stage)
- `EKS_CLUSTER_NAME` – EKS cluster name (enables deploy stage)
