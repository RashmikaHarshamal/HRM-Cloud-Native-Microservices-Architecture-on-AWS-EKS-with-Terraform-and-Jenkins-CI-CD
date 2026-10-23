pipeline {
  agent any

  environment {
    AWS_REGION = 'us-east-1'
    ECR_REPOSITORY = 'hrm-service'
    IMAGE_TAG = "${env.BUILD_NUMBER}"
    K8S_NAMESPACE = 'hrm'
  }

  options {
    timestamps()
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Terraform Validate') {
      steps {
        sh 'terraform -chdir=terraform fmt -check'
        sh 'terraform -chdir=terraform init -backend=false'
        sh 'terraform -chdir=terraform validate'
      }
    }

    stage('Build Image') {
      when {
        expression { return fileExists('Dockerfile') }
      }
      steps {
        sh 'docker build -t ${ECR_REPOSITORY}:${IMAGE_TAG} .'
      }
    }

    stage('Push Image') {
      when {
        expression { return env.ECR_REGISTRY?.trim() }
      }
      steps {
        sh 'aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}'
        sh 'docker tag ${ECR_REPOSITORY}:${IMAGE_TAG} ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}'
        sh 'docker push ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}'
      }
    }

    stage('Deploy to EKS') {
      when {
        expression { return env.EKS_CLUSTER_NAME?.trim() }
      }
      steps {
        sh 'aws eks update-kubeconfig --region ${AWS_REGION} --name ${EKS_CLUSTER_NAME}'
        sh 'kubectl apply -f k8s/namespace.yaml'
        sh 'kubectl apply -f k8s/deployment.yaml'
        sh 'kubectl apply -f k8s/service.yaml'
      }
    }
  }
}
