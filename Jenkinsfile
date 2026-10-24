// CI/CD: build 5 images -> push to ECR -> deploy to EKS.
// Runs on the Jenkins EC2 instance (IAM role hrm-jenkins-role), see docs/DEPLOY_EKS_FAST.md.
pipeline {
  agent any

  options {
    disableConcurrentBuilds()
    timeout(time: 60, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '10'))
  }

  triggers {
    pollSCM('H/5 * * * *')
  }

  environment {
    AWS_REGION = 'ap-southeast-1'
    AWS_DEFAULT_REGION = 'ap-southeast-1'
    AWS_PAGER = ''
    CLUSTER = 'hrm-prod'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        script {
          def account = sh(script: 'aws sts get-caller-identity --query Account --output text', returnStdout: true).trim()
          env.REGISTRY = "${account}.dkr.ecr.${env.AWS_REGION}.amazonaws.com"
          // ECR tags are immutable, so include the build number and time.
          env.IMAGE_TAG = sh(script: 'echo "$(git rev-parse --short=12 HEAD)-b${BUILD_NUMBER}-$(date -u +%Y%m%d%H%M%S)"', returnStdout: true).trim()
        }
        echo "Image tag: ${env.IMAGE_TAG}"
      }
    }

    stage('Build and push images') {
      steps {
        sh '''#!/usr/bin/env bash
set -euo pipefail
aws ecr get-login-password | docker login --username AWS --password-stdin "$REGISTRY"

for pair in user-service:User hr-service:HR employee-service:Employee admin-service:Admin; do
  name="${pair%%:*}"
  dir="hrm_backend/${pair##*:}_Backend"
  docker build --platform linux/amd64 -t "$REGISTRY/hrm/$name:$IMAGE_TAG" "$dir"
  docker push "$REGISTRY/hrm/$name:$IMAGE_TAG"
done

docker build --platform linux/amd64 \
  --build-arg VITE_AUTH_URL=/user/api \
  --build-arg VITE_API_BASE_URL=/hr/api \
  --build-arg VITE_EMPLOYEE_URL=/employee/api \
  --build-arg VITE_ADMIN_URL=/admin/api \
  -t "$REGISTRY/hrm/frontend:$IMAGE_TAG" hrm_frontend
docker push "$REGISTRY/hrm/frontend:$IMAGE_TAG"
'''
      }
    }

    stage('Deploy to EKS') {
      steps {
        sh '''#!/usr/bin/env bash
set -euo pipefail
aws eks update-kubeconfig --name "$CLUSTER" --region "$AWS_REGION"

for f in k8s/backends.yaml k8s/frontend.yaml; do
  sed -e "s|__REGISTRY__|$REGISTRY|g" -e "s|__TAG__|$IMAGE_TAG|g" "$f" | kubectl apply -f -
done

for d in user-service hr-service employee-service admin-service frontend; do
  kubectl -n hrm rollout status "deployment/$d" --timeout=600s
done
kubectl -n hrm get pods -o wide
'''
      }
    }
  }

  post {
    success {
      echo "Deployed ${env.IMAGE_TAG}"
    }
    failure {
      echo 'Deployment failed. Roll back with: kubectl -n hrm rollout undo deployment/<name>'
    }
  }
}
