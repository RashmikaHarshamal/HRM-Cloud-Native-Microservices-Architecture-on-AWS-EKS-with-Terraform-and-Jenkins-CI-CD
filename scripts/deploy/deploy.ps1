# Build all 5 images, push them to ECR, and deploy them to EKS.
# Run from anywhere in PowerShell 7:  .\scripts\deploy\deploy.ps1
param(
    [string]$Region = "ap-southeast-1"
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $true

Push-Location (Join-Path $PSScriptRoot "..\..")
try {
    $account = (aws sts get-caller-identity --query Account --output text).Trim()
    $registry = "$account.dkr.ecr.$Region.amazonaws.com"
    # ECR tags are immutable, so every run gets a fresh tag.
    $tag = "$((git rev-parse --short=12 HEAD).Trim())-$(Get-Date -Format 'yyyyMMddHHmmss')"
    Write-Host "Registry: $registry  Tag: $tag" -ForegroundColor Cyan

    # docker push authenticates through the ecr-login helper, which can't read `aws login` sessions.
    try { $registry | docker-credential-ecr-login get *> $null }
    catch {
        throw "ECR credential helper found no credentials. Run: `$env:AWS_PROFILE = `"hrm-tf`"  (see docs/DEPLOY_EKS_FAST.md B1b)"
    }

    $images = [ordered]@{
        "user-service"     = "hrm_backend/User_Backend"
        "hr-service"       = "hrm_backend/HR_Backend"
        "employee-service" = "hrm_backend/Employee_Backend"
        "admin-service"    = "hrm_backend/Admin_Backend"
        "frontend"         = "hrm_frontend"
    }
    # The frontend calls its own origin; nginx in k8s/frontend.yaml routes these paths.
    $frontendArgs = @(
        "--build-arg", "VITE_AUTH_URL=/user/api",
        "--build-arg", "VITE_API_BASE_URL=/hr/api",
        "--build-arg", "VITE_EMPLOYEE_URL=/employee/api",
        "--build-arg", "VITE_ADMIN_URL=/admin/api"
    )

    foreach ($name in $images.Keys) {
        $image = "$registry/hrm/${name}:$tag"
        Write-Host "Building $image" -ForegroundColor Cyan
        $extra = if ($name -eq "frontend") { $frontendArgs } else { @() }
        docker build --platform linux/amd64 @extra -t $image $images[$name]
        # Slow uplinks can time out mid-push; ECR keeps finished layers, so a retry resumes.
        for ($attempt = 1; ; $attempt++) {
            try { docker push $image; break }
            catch {
                if ($attempt -ge 4) { throw }
                Write-Host "Push failed (attempt $attempt), retrying in 10s..." -ForegroundColor Yellow
                Start-Sleep -Seconds 10
            }
        }
    }

    foreach ($file in "k8s/backends.yaml", "k8s/frontend.yaml") {
        (Get-Content $file -Raw).Replace("__REGISTRY__", $registry).Replace("__TAG__", $tag) |
            kubectl apply -f -
    }

    foreach ($d in "user-service", "hr-service", "employee-service", "admin-service", "frontend") {
        kubectl -n hrm rollout status "deployment/$d" --timeout=600s
    }
    Write-Host "Deployed tag $tag" -ForegroundColor Green
}
finally {
    Pop-Location
}
