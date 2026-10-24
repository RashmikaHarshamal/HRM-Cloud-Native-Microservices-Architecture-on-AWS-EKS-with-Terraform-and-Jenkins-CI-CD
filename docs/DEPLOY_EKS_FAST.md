# HRM on AWS EKS — Step-by-Step Guide

This guide takes you from **nothing running** to a **real deployment on AWS** with **Terraform**, **EKS (Kubernetes)**, **RDS**, **ECR** and **Jenkins CI/CD**.

Every step has 4 parts:

- **What & why**: what you are doing and why it is needed
- **Do this**: the exact commands
- **You should see**: how you know it worked
- **If it fails**: the most common problems

Do the steps **in order**. Don't go to the next step until "You should see" is true.

---

## Part A — Understand the big picture (read this first, 5 min)

### What we are building

```
   Your browser
        │  http://xxxx.ap-southeast-1.elb.amazonaws.com
        ▼
 ┌──────────────────────┐   AWS Load Balancer (created automatically by Kubernetes)
 │ frontend pod (nginx) │   - shows the React app
 └──┬──────┬──────┬─────┘   - sends /user/... /hr/... /employee/... /admin/... to the right backend
    ▼      ▼      ▼      ▼
  user    hr   employee  admin      ← 4 Spring Boot pods inside EKS (Kubernetes)
    └──────┴──────┴──────┘
             ▼
     RDS PostgreSQL (4 databases, private — not on the internet)

 Jenkins (EC2) : git push → build Docker images → push to ECR → deploy to EKS
```

### What each AWS service does

| Service | Simple meaning | In this project |
|---|---|---|
| **VPC** | Your private network in AWS | Public subnets (load balancer, Jenkins) + private subnets (pods, database) |
| **EKS** | Kubernetes managed by AWS | Runs your 5 containers on 2 EC2 machines (nodes) |
| **RDS** | PostgreSQL managed by AWS | Holds the 4 HRM databases |
| **ECR** | A private Docker Hub in AWS | Stores your 5 Docker images |
| **Terraform** | Code that creates AWS resources | Creates VPC + EKS + RDS + ECR with one command |
| **Jenkins** | Automation server | Rebuilds and redeploys every time you push to GitHub |

### What I left out of your docx (and what to say if evaluators ask)

| Left out | Reason |
|---|---|
| EC2 + Docker Compose staging server | Not needed. We deploy straight to EKS (the "real" deployment) |
| Data migration | Fresh databases. Spring Boot (`ddl-auto: update`) creates the tables by itself |
| ALB controller, Helm, eksctl, ACM certificate, domain DNS (Phase 7) | These need a **domain name**. Instead, Kubernetes creates one AWS load balancer for the frontend |
| S3 + CloudFront (Phase 8) | The frontend runs as a pod in EKS instead |

The trade-off is that the site uses **http**, not https. HTTPS needs a domain (docx Phase 7).

### Files already prepared for you in the repo

| File | What it does |
|---|---|
| `infra/terraform/*.tf` | Terraform code: VPC, EKS, RDS, ECR (5 repos) |
| `k8s/00-namespace.yaml` | Creates a "folder" in Kubernetes called `hrm` for all your resources |
| `k8s/01-config.yaml` | Non-secret settings (DB host, DB names, service URLs, port 8080) |
| `k8s/backends.yaml` | Tells Kubernetes how to run the 4 backends (image, port, health checks, memory) |
| `k8s/frontend.yaml` | nginx routing rules + frontend pod + **public load balancer** |
| `scripts/deploy/deploy.ps1` | From your laptop: build 5 images → push to ECR → deploy to EKS |
| `Jenkinsfile` | The same as `deploy.ps1`, but Jenkins runs it automatically |

### Time and money

- Time: about **4–5 hours**, much of it waiting.
- Cost: about **USD 8–10 per day** while everything runs. **Do Part J (delete everything) after the evaluation.**

### Where to type commands

- **PowerShell 7** on your laptop, unless the step says **"on the Jenkins server"**.
- Always start in the project folder:

```powershell
cd "D:\Projects\HRM Cloud-Native Microservices Architecture on AWS (EKS) with Terraform and Jenkins CICD"
```

---

## Part B — Prepare your laptop (10 min)

### B1. Log in to AWS

**What & why:** Terraform, kubectl and Docker all need AWS permission. Your login session has expired.

**Do this:**

```powershell
aws login    / aws login --profile default
aws sts get-caller-identity
```

**You should see:** JSON with `"Account": "895207965225"` (your account).

**If it fails:** "session expired" → run `aws login` again. Wrong account → you are logged in to the wrong AWS account or profile.

### B1b. One-time setup for this laptop (already done)

These fixed problems we hit. Keep them; you don't need to repeat them:

| Problem | Fix that is now in place |
|---|---|
| Logged in as root | IAM user `hrm-admin` (AdministratorAccess); `aws login` as that user |
| Terraform `No valid credential sources found` (AWS provider v5 can't read `aws login` sessions) | Profile `hrm-tf` in `~\.aws\config` with `credential_process = aws configure export-credentials --profile default --format process` |
| Old account's state bucket `AllAccessDisabled` | New bucket `hrm-terraform-state-895207965225-ap-southeast-1` in `backend.tf`, then `terraform init -reconfigure` |
| `docker login` → `The stub received bad data.` (ECR token too big for Windows Credential Manager) | `~\.docker\config.json` has `"credHelpers": {"895207965225.dkr.ecr.ap-southeast-1.amazonaws.com": "ecr-login"}`; `deploy.ps1` doesn't run `docker login` |

**Every new PowerShell window (also after a restart):**

```powershell
cd "D:\Projects\HRM Cloud-Native Microservices Architecture on AWS (EKS) with Terraform and Jenkins CICD"
$env:AWS_PROFILE = "hrm-tf"
aws sts get-caller-identity          # must be user/hrm-admin; if expired → aws login
(Invoke-RestMethod https://checkip.amazonaws.com).Trim()   # changed? → B3
```

Also start **Docker Desktop** and wait for "Engine running" before Part F.

### B2. Check the tools are installed

**Do this:**

```powershell
terraform version
kubectl version --client
docker version
```

**You should see:** a version number for all three. For `docker version`, the "Server" part must also show, so **start Docker Desktop first**.

### B3. Check your public IP

**What & why:** For security, EKS only accepts `kubectl` commands from **your IP address**. The IP is written in `infra/terraform/terraform.tfvars`.

**Do this:**

```powershell
(Invoke-RestMethod https://checkip.amazonaws.com).Trim()
Get-Content infra\terraform\terraform.tfvars
```

**You should see:** the same IP in both, for example `103.247.48.94` and `admin_public_cidr = "103.247.48.94/32"`.

**If they differ:** open `infra\terraform\terraform.tfvars` and change it to your IP + `/32`. Save.

> ⚠️ If your router restarts, your IP may change. Then `kubectl` stops working (timeout). Fix: update this file and run `terraform apply` again (Part C).

---

## Part C — Create the AWS infrastructure with Terraform (30 min, mostly waiting)

**What & why:** Terraform reads the `.tf` files and creates everything in AWS:

- `vpc.tf` → network, 2 zones, public/private/database subnets, NAT gateway
- `eks.tf` → Kubernetes cluster `hrm-prod` + 2 worker machines (t3.large)
- `rds.tf` → PostgreSQL 16 database server (private)
- `ecr.tf` → 5 image repositories: `hrm/user-service`, `hrm/hr-service`, `hrm/employee-service`, `hrm/admin-service`, `hrm/frontend`

The state (Terraform's memory of what it created) is saved in an S3 bucket (`backend.tf`).

### C1. Initialise

```powershell
cd infra\terraform
terraform init
```

**You should see:** `Terraform has been successfully initialized!`

### C2. Preview

```powershell
terraform plan -out hrm.tfplan
```

**What & why:** `plan` shows what Terraform **will** create, without changing anything yet.

**You should see:** at the end, `Plan: XX to add, 0 to change, 0 to destroy`. If you created some resources in an earlier attempt, the number is smaller. That's fine.

**If it fails:**
- `No valid credential` → go back to B1.
- `Error acquiring the state lock` → another terraform command is still running. Wait, or close the other window.

### C3. Create

```powershell
terraform apply hrm.tfplan
```

This takes **15–25 minutes** (EKS is slow). Don't close the window.

**You should see:** `Apply complete!` and outputs: `cluster_name`, `rds_endpoint`, `rds_secret_arn`, `ecr_urls`.

### C4. Connect kubectl to the new cluster

**What & why:** `kubectl` needs to know where your cluster is. This command writes the connection into `~/.kube/config`.

```powershell
aws eks update-kubeconfig --region ap-southeast-1 --name hrm-prod --alias hrm-prod
kubectl get nodes
cd ..\..
```

**You should see:** 2 nodes with `STATUS = Ready`.

**If it fails:** `i/o timeout` → your IP is different (see B3).

---

## Part D — Create the databases (15 min)

**What & why:** RDS gives you an empty PostgreSQL server. Each backend needs **its own database and its own user**:

| Backend | Database | User |
|---|---|---|
| User | `hrm_db_user` | `hrm_user_svc` |
| HR | `hrm_db_hr` | `hrm_hr_svc` |
| Employee | `hrm_db_employee` | `hrm_employee_svc` |
| Admin | `hrm_db_admin` | `hrm_admin_svc` |

RDS is **private** (not reachable from your laptop). So we start a temporary pod **inside the cluster** that has the `psql` tool.

### D1. Get the database address and the master password

```powershell
$RDS = (terraform -chdir=infra/terraform output -raw rds_endpoint).Split(":")[0]
$RDS
aws secretsmanager get-secret-value --region ap-southeast-1 `
  --secret-id (terraform -chdir=infra/terraform output -raw rds_secret_arn) `
  --query SecretString --output text
```

**You should see:**
- an address like `hrm-prod.xxxxxx.ap-southeast-1.rds.amazonaws.com`
- `{"username":"hrm_admin","password":"..."}`. Copy the password; this is the **master password**.

### D2. Choose 4 passwords

Write down 4 new passwords, one per service. Use **only letters and numbers**, for example `UserPass2026x`. You'll need them again in Part E.

### D3. Start the temporary psql pod

```powershell
kubectl run psql --image=postgres:16 --restart=Never -- sleep 7200
kubectl wait --for=condition=Ready pod/psql --timeout=180s
kubectl exec -it psql -- bash
```

**You should see:** your prompt changes to something like `root@psql:/#`. You are now **inside the pod** (Linux).

### D4. Connect to RDS

Inside the pod (paste your RDS address from D1):

```bash
export PGHOST='hrm-prod.xxxxxx.ap-southeast-1.rds.amazonaws.com' PGSSLMODE=require
psql -U hrm_admin -d postgres
```

Enter the **master password**. **You should see:** `postgres=>`

**If it hangs/timeout:** wrong address. Check `$RDS` again.

### D5. Create users and databases

Paste this, using **your 4 passwords**:

```sql
CREATE USER hrm_user_svc     PASSWORD 'UserPass2026x';
CREATE USER hrm_hr_svc       PASSWORD 'HrPass2026x';
CREATE USER hrm_employee_svc PASSWORD 'EmpPass2026x';
CREATE USER hrm_admin_svc    PASSWORD 'AdminPass2026x';
GRANT hrm_user_svc, hrm_hr_svc, hrm_employee_svc, hrm_admin_svc TO hrm_admin;
CREATE DATABASE hrm_db_user     OWNER hrm_user_svc;
CREATE DATABASE hrm_db_hr       OWNER hrm_hr_svc;
CREATE DATABASE hrm_db_employee OWNER hrm_employee_svc;
CREATE DATABASE hrm_db_admin    OWNER hrm_admin_svc;
\l
```

**What & why:** the `GRANT` line lets the master user give database ownership to the service users. `\l` lists the databases.

**You should see:** the 4 `hrm_db_*` databases with the correct owners.

### D6. Leave and clean up

```sql
\q
```
```bash
exit
```
```powershell
kubectl delete pod psql
```

---

## Part E — Kubernetes settings: namespace, Secret, ConfigMap (10 min)

**What & why:**
- **Namespace** `hrm`: a group for all HRM resources.
- **Secret** `hrm-secrets`: passwords and the JWT key. Kubernetes stores these separately from normal settings.
- **ConfigMap** `hrm-config`: normal settings, such as the DB address, DB names, the port (8080), and the URLs the services use to call each other.

The pods read both as **environment variables**. Spring Boot reads these through `application.yml` (for example `${HR_DB_PASSWORD}`).

### E1. Namespace

```powershell
kubectl apply -f k8s/00-namespace.yaml
```

**You should see:** `namespace/hrm created`

### E2. Secret

```powershell
$JWT = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(64))

kubectl -n hrm create secret generic hrm-secrets `
  --from-literal=JWT_SECRET=$JWT `
  --from-literal=USER_DB_PASSWORD='UserPass2026x' `
  --from-literal=HR_DB_PASSWORD='HrPass2026x' `
  --from-literal=EMPLOYEE_DB_PASSWORD='EmpPass2026x' `
  --from-literal=ADMIN_DB_PASSWORD='AdminPass2026x'
```

Use **the same 4 passwords as in D5**. The first line creates a random JWT signing key (used for login tokens).

**You should see:** `secret/hrm-secrets created`. Check it with `kubectl -n hrm describe secret hrm-secrets`, which should show 5 keys.

### E3. ConfigMap

`k8s/01-config.yaml` contains two placeholders: `__RDS_HOST__` and `__APP_URL__`. This command replaces them and applies the file:

```powershell
(Get-Content k8s/01-config.yaml -Raw).Replace("__RDS_HOST__", $RDS).Replace("__APP_URL__", "http://localhost") |
  kubectl apply -f -
```

We don't know the app URL yet, so `http://localhost` is temporary. You'll fix it in F3.

**You should see:** `configmap/hrm-config created`

> If you opened a new PowerShell window, `$RDS` is empty. Run the first line of D1 again.

---

## Part F — First deployment from your laptop (30 min)

**What & why:** `scripts/deploy/deploy.ps1` does 4 things:

1. Gets the ECR registry address (the ECR login is done automatically by the `ecr-login` helper, see B1b).
2. Builds 5 Docker images (each service folder already has a `Dockerfile`). The frontend is built with API URLs like `/hr/api`, so it calls the same address it's served from.
3. Pushes them to ECR with a unique tag (git commit + time).
4. Replaces `__REGISTRY__` and `__TAG__` in `k8s/backends.yaml` and `k8s/frontend.yaml`, applies them, and waits until every pod is ready.

### F1. Run it

Docker Desktop must be running.

```powershell
.\scripts\deploy\deploy.ps1
```

The first run takes **15–25 minutes** (Gradle and npm download dependencies).

**You should see:** at the end, `deployment "frontend" successfully rolled out` and `Deployed tag ...`.

**If it fails:**
- `docker build` error → read the error. Usually a compile error in the code.
- `rollout status ... timed out` → a pod didn't start. Go to Part G "If a pod fails".

### F2. Get the public URL

**What & why:** `k8s/frontend.yaml` has `type: LoadBalancer`, so AWS creates a real load balancer for it. This takes 2–3 minutes.

```powershell
kubectl -n hrm get svc frontend -w
```

Wait until `EXTERNAL-IP` shows a long name, then press **Ctrl+C**.

```powershell
$APP = "http://" + (kubectl -n hrm get svc frontend -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
$APP
```

**You should see:** something like `http://a1b2c3...ap-southeast-1.elb.amazonaws.com`. **Write it down.** This is your app's address. http://a7df0f22fb87842e08d78a9172d07884-801340722.ap-southeast-1.elb.amazonaws.com

### F3. Tell the backends the real URL

**What & why:** the backends use this URL for CORS (which websites may call them) and for links in emails.

```powershell
(Get-Content k8s/01-config.yaml -Raw).Replace("__RDS_HOST__", $RDS).Replace("__APP_URL__", $APP) |
  kubectl apply -f -
kubectl -n hrm rollout restart deployment
```

The restart is needed because pods only read the ConfigMap when they start. Wait about 2 minutes.

---

## Part G — Test it (15 min)

### G1. All pods running

```powershell
kubectl -n hrm get pods
```

**You should see:** 5 pods, all `1/1 Running`.

### G2. Health check through the load balancer

```powershell
curl.exe -i "$APP/hr/actuator/health/readiness"
curl.exe -i "$APP/hr/api/internal/test"
```

**You should see:**
- the first command returns `HTTP/1.1 200` and `{"status":"UP"}`, which means internet → load balancer → nginx → HR pod is working
- the second returns `HTTP/1.1 403`, which shows the internal APIs are blocked from the internet

### G3. Open the app

```powershell
start $APP
```

Log in and try a few pages. If the browser says "site can't be reached", wait 5 minutes (DNS for a new load balancer is slow).

### If a pod fails

```powershell
kubectl -n hrm get pods                                   # which pod is broken?
kubectl -n hrm describe pod <pod-name>                    # look at "Events" at the bottom
kubectl -n hrm logs deployment/hr-service --tail=100      # application log
```

| Message | Meaning | Fix |
|---|---|---|
| `password authentication failed` | Secret password ≠ database password | Delete and recreate the Secret (E2) with the D5 passwords, then `kubectl -n hrm rollout restart deployment` |
| `Connection timed out` to the database | Wrong DB_HOST | Redo E3 with the correct `$RDS` |
| `ImagePullBackOff` | Image not in ECR | Run `deploy.ps1` again |
| `CrashLoopBackOff` | The app crashes on start | Read `kubectl logs` |
| `Pending` | Not enough memory on the nodes | `kubectl get nodes`; both must be Ready |

**🎉 Now you have a real working deployment on AWS.** The next part only automates it.

---

## Part H — Jenkins CI/CD (90 min)

**What & why:** Right now you deploy by running `deploy.ps1` yourself. With Jenkins:

`git push` → Jenkins notices within 5 min → builds images → pushes to ECR → updates EKS.

Jenkins runs on its own EC2 machine. It gets AWS permissions from an **IAM role**, so you don't need passwords or access keys on the server.

### H1. Push the deployment files to GitHub

**Why:** Jenkins gets the code (and the `Jenkinsfile`) from GitHub.

```powershell
git add Jenkinsfile k8s scripts/deploy infra/terraform/ecr.tf docs/DEPLOY_EKS_FAST.md README.md
git commit -m "Add EKS manifests, deploy script and Jenkins pipeline"
git push
```


### H2. Create the IAM role for Jenkins (AWS Console)

**Why:** gives the Jenkins machine permission to push images to ECR and to find the EKS cluster.

1. AWS Console → **IAM** → **Roles** → **Create role**
2. Trusted entity: **AWS service**. Use case: **EC2**. Click **Next**.
3. Search and tick **AmazonEC2ContainerRegistryPowerUser**. Click **Next**.
4. Role name: `hrm-jenkins-role`. Click **Create role**.
5. Open the role → **Add permissions** → **Create inline policy** → **JSON**, then paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "eks:DescribeCluster",
    "Resource": "arn:aws:eks:ap-southeast-1:895207965225:cluster/hrm-prod"
  }]
}
```

6. Name it `hrm-jenkins-eks` and click **Create policy**.

### H3. Launch the Jenkins EC2 machine

AWS Console → top-right region **Asia Pacific (Singapore)** → **EC2** → **Launch instance**:

| Field | Value | Why |
|---|---|---|
| Name | `hrm-jenkins` | |
| AMI | **Ubuntu Server 24.04 LTS**, 64-bit (x86) | |
| Instance type | `t3.large` | Docker builds need 8 GB RAM |
| Key pair | **Create new key pair** → `hrm-jenkins-key`, .pem → save it, for example to `D:\keys\` | For SSH |
| Network settings → **Edit** → VPC | **hrm-prod** | Same network as EKS |
| Subnet | one with **public** in its name | So you can SSH to it |
| Auto-assign public IP | **Enable** | |
| Firewall | Create security group `hrm-jenkins-sg`: SSH, port 22, source **My IP** | Only you can connect |
| Storage | 30 GiB gp3 | Docker images take space |
| Advanced details → IAM instance profile | `hrm-jenkins-role` | Gives the H2 permissions |

Click **Launch instance**. Open the instance and copy its **Public IPv4 address**.

### H4. Allow Jenkins to talk to EKS

**Why:** the EKS API only allows your laptop IP from the internet. Jenkins is inside the same VPC, so it uses the **private** EKS endpoint, which needs a firewall rule. It also needs permission inside Kubernetes.

**a) Firewall rule (Console):**
EKS → Clusters → `hrm-prod` → **Networking** tab → click the **Cluster security group** link → **Inbound rules** → **Edit** → **Add rule**: Type **HTTPS**, Source: choose `hrm-jenkins-sg` → **Save**.

**b) Kubernetes permission (laptop PowerShell):**

```powershell
$ROLE = "arn:aws:iam::895207965225:role/hrm-jenkins-role"
aws eks create-access-entry --cluster-name hrm-prod --region ap-southeast-1 --principal-arn $ROLE
aws eks associate-access-policy --cluster-name hrm-prod --region ap-southeast-1 --principal-arn $ROLE `
  --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSEditPolicy `
  --access-scope "type=namespace,namespaces=hrm"
```

This lets Jenkins deploy to the `hrm` namespace only. **You should see:** JSON output from both commands, with no error.

### H5. Connect to the Jenkins machine

```powershell
icacls "D:\keys\hrm-jenkins-key.pem" /inheritance:r /grant:r "$($env:USERNAME):R"
ssh -i "D:\keys\hrm-jenkins-key.pem" ubuntu@JENKINS_PUBLIC_IP
```

The first line fixes the key file permissions (Windows SSH refuses keys that others can read). Type `yes` when asked.

**You should see:** `ubuntu@ip-10-20-...:~$`. You are now **on the Jenkins server**.

### H6. Install the software (on the Jenkins server)

Paste these blocks one by one:

**Docker, Java (Jenkins needs Java), Git:**

```bash
sudo apt update
sudo apt install -y git curl unzip fontconfig openjdk-21-jre docker.io docker-buildx
```

**Jenkins:**

```bash
sudo install -d -m 0755 /etc/apt/keyrings
sudo curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2026.key -o /etc/apt/keyrings/jenkins-keyring.asc
echo 'deb [signed-by=/etc/apt/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/' |
  sudo tee /etc/apt/sources.list.d/jenkins.list >/dev/null
sudo apt update && sudo apt install -y jenkins
```

(If `apt update` shows a key error, check the current key file name on https://www.jenkins.io/doc/book/installing/linux/.)

**Let Jenkins use Docker:**

```bash
sudo usermod -aG docker jenkins
sudo systemctl enable --now docker
sudo systemctl restart jenkins
```

**AWS CLI:**

```bash
curl -fsSL https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip -o /tmp/awscli.zip
unzip -q /tmp/awscli.zip -d /tmp && sudo /tmp/aws/install
aws sts get-caller-identity
```

**You should see:** `"Arn": "...assumed-role/hrm-jenkins-role/..."`. This proves the IAM role works.

**kubectl (same version as the cluster):**

```bash
V=$(aws eks describe-cluster --name hrm-prod --region ap-southeast-1 --query cluster.version --output text)
K=$(curl -fsSL https://dl.k8s.io/release/stable-$V.txt)
curl -fsSLo /tmp/kubectl https://dl.k8s.io/release/$K/bin/linux/amd64/kubectl
sudo install -m 0755 /tmp/kubectl /usr/local/bin/kubectl
```

**Test as the `jenkins` user (important):**

```bash
sudo -u jenkins -H aws eks update-kubeconfig --name hrm-prod --region ap-southeast-1
sudo -u jenkins -H kubectl -n hrm get deployments
sudo -u jenkins -H docker ps
```

**You should see:** your 5 deployments, and an empty Docker list with no "permission denied".

**If it fails:**
- kubectl `timeout` → check the H4a firewall rule.
- `Unauthorized` / `Forbidden` → check the H4b commands.
- docker `permission denied` → run `sudo systemctl restart jenkins` again.

**Get the Jenkins unlock password:**

```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

Copy it.

### H7. Open Jenkins in your browser

**Why:** Jenkins runs on port 8080, but we did **not** open that port to the internet (safer). An SSH tunnel forwards it to your laptop.

Open a **new** PowerShell window and leave it running:

```powershell
ssh -i "D:\keys\hrm-jenkins-key.pem" -N -L 18080:127.0.0.1:8080 ubuntu@JENKINS_PUBLIC_IP
```

(It looks like it's hanging. That's normal.)

In the browser, open **http://localhost:18080**:

1. Paste the unlock password.
2. Choose **Install suggested plugins** and wait.
3. Create your admin user, then **Save and Finish**.

### H8. Create the pipeline job

1. **New Item** → name `hrm-deploy` → select **Pipeline** → **OK**
2. Scroll to **Pipeline**:
   - Definition: **Pipeline script from SCM**
   - SCM: **Git**
   - Repository URL: `https://github.com/RashmikaHarshamal/HRM-Cloud-Native-Microservices-Architecture-on-AWS-EKS-with-Terraform-and-Jenkins-CI-CD.git`
   - Credentials: if the repo is **private**, click **Add**, choose Username with password, and enter your GitHub username + a GitHub **personal access token**
   - Branch Specifier: `*/main`
   - Script Path: `Jenkinsfile`
3. **Save**

### H9. Run it

Click **Build Now**, then open the build (#1) → **Console Output**.

**What the `Jenkinsfile` does:**

| Stage | What happens |
|---|---|
| Checkout | Downloads the code from GitHub, makes an image tag (commit + build number + time) |
| Build and push images | Builds the 5 Docker images and pushes them to ECR |
| Deploy to EKS | Puts the new tag into `k8s/backends.yaml` and `k8s/frontend.yaml`, runs `kubectl apply`, and waits for the rollout |

The first run takes **15–20 min**. **You should see:** `Finished: SUCCESS`.

### H10. Prove the automation works (show this in the evaluation)

1. Change something visible in the frontend, for example a heading text.
2. `git commit` and `git push`.
3. Within 5 minutes Jenkins starts a new build by itself (the `pollSCM` trigger in the Jenkinsfile).
4. When it's green, refresh `$APP` and your change appears.

If a deployment is bad, roll back with `kubectl -n hrm rollout undo deployment/<name>`.

---

## Part I — What to show the evaluators

```powershell
terraform -chdir=infra/terraform state list         # all AWS resources made by code
kubectl get nodes                                    # the EKS worker machines
kubectl -n hrm get deploy,svc,pods                   # the running services
aws ecr list-images --repository-name hrm/hr-service --region ap-southeast-1
```

Then show:
1. the app at `$APP` (log in, use a feature)
2. the Jenkins pipeline stages
3. a live `git push` → automatic deployment (H10)

Be ready to explain:
- **Why RDS is private:** security. Only EKS nodes can reach it (`rds.tf` security group).
- **Why pods are in private subnets:** they're not directly reachable from the internet. Only the load balancer is public.
- **Health probes:** Kubernetes restarts a pod if `/actuator/health/liveness` fails, and sends traffic only when `/readiness` is OK.
- **Rolling update:** `maxUnavailable: 0` means the new pod must be ready before the old one stops, so there's no downtime.

---

## Part J — Delete everything after the evaluation (stop paying)

Do it **in this order**. Leftover resources inside the VPC block Terraform from deleting it.

1. **Jenkins:** EC2 → terminate `hrm-jenkins`. In the cluster security group, remove the HTTPS rule from H4a. Then delete security group `hrm-jenkins-sg`.
2. **Load balancer:**

   ```powershell
   kubectl delete namespace hrm
   ```

   Wait until the load balancer is gone in EC2 → **Load Balancers**.
3. **Terraform:** open `infra/terraform/rds.tf` and change `deletion_protection = true` to `false`. Then:

   ```powershell
   terraform -chdir=infra/terraform apply
   aws rds describe-db-snapshots --region ap-southeast-1 --db-snapshot-identifier hrm-prod-final
   ```

   If that snapshot **already exists** (from an earlier attempt), delete it in RDS → Snapshots. Otherwise destroy fails.

   ```powershell
   terraform -chdir=infra/terraform destroy
   ```

4. IAM → delete role `hrm-jenkins-role` (optional).
