# Deployment Guide — WSL / Linux (Complete)

This guide covers every single step to go from a fresh WSL terminal to a fully running GitOps platform with GitHub Actions and ArgoCD. Every command is included. Follow steps in order.

---

## What you will have at the end

- Docker installed and running in WSL
- A local Kubernetes cluster created with kind
- ArgoCD installed and managing two environments (dev and prod)
- GitHub Actions automatically building, pushing, and deploying your app on every `git push`

---

## Part 1 — Install WSL (Windows only, skip if already on Linux)

Open **PowerShell as Administrator** on Windows and run:

```powershell
wsl --install
```

Restart your machine when prompted. After restart, open the **Ubuntu** app from the Start menu and create your Linux username and password.

Verify WSL is running:

```bash
uname -a
```

You should see a Linux kernel version in the output.

---

## Part 2 — Install Docker in WSL

### Option A — Docker Desktop (recommended for Windows users)

1. Download Docker Desktop from `https://www.docker.com/products/docker-desktop`
2. Install it on Windows
3. Open Docker Desktop → Settings → Resources → WSL Integration
4. Enable integration for your WSL distro (Ubuntu)
5. Click **Apply and Restart**

Verify inside WSL:

```bash
docker --version
docker run hello-world
```

### Option B — Docker Engine directly in WSL (no Docker Desktop)

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

sudo usermod -aG docker $USER
newgrp docker

sudo service docker start
docker --version
```

---

## Part 3 — Install kubectl

```bash
curl -LO "https://dl.k8s.io/release/$(curl -sL https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/
kubectl version --client
```

Expected output:

```
Client Version: v1.xx.x
Kustomize Version: v5.x.x
```

---

## Part 4 — Install kind

kind (Kubernetes in Docker) creates a local Kubernetes cluster using Docker containers as nodes.

```bash
curl -LO https://kind.sigs.k8s.io/dl/v0.27.0/kind-linux-amd64
chmod +x kind-linux-amd64
sudo mv kind-linux-amd64 /usr/local/bin/kind
kind version
```

Expected output:

```
kind v0.27.0 go1.xx linux/amd64
```

---

## Part 5 — Install git (if not installed)

```bash
sudo apt-get install -y git
git --version
```

Configure your identity:

```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

---

## Part 6 — Fork and clone the repository

1. Go to `https://github.com/code-and-secure/Autonomous-Release-Orchestration-Platform`
2. Click **Fork** → Create fork under your own GitHub account

Then clone your fork in WSL:

```bash
git clone https://github.com/<your-github-username>/Autonomous-Release-Orchestration-Platform.git
cd Autonomous-Release-Orchestration-Platform
```

---

## Part 7 — Fix GitHub Actions GHCR permissions (one-time)

GitHub Actions uses `GITHUB_TOKEN` to push images. No secrets are needed, but the GHCR package must be linked to your repository.

1. Push any commit to `main` to trigger the first GitHub Actions run:

```bash
git commit --allow-empty -m "ci: trigger first build"
git push origin main
```

2. Wait for GitHub Actions to finish (check the **Actions** tab on your repo)
3. Go to `github.com` → your profile → **Packages** → `autonomous-release-platform`
4. Click **Package settings**
5. Under **Manage Actions access** → click **Add repository**
6. Select your repository → set role to **Write** → click **Add repository**

If you skip this step you will get `permission_denied: write_package` error in GitHub Actions.

---

## Part 8 — Create the Kubernetes cluster

```bash
kind create cluster --name argo-platform
```

Expected output:

```
Creating cluster "argo-platform" ...
 ✓ Ensuring node image (kindest/node:v1.36.1)
 ✓ Preparing nodes
 ✓ Writing configuration
 ✓ Starting control-plane
 ✓ Installing CNI
 ✓ Installing StorageClass
Set kubectl context to "kind-argo-platform"
```

Verify the node is ready:

```bash
kubectl get nodes
```

Expected output:

```
NAME                          STATUS   ROLES           AGE   VERSION
argo-platform-control-plane   Ready    control-plane   1m    v1.36.1
```

> If STATUS shows `NotReady`, wait 30 seconds and run the command again. The CNI plugin takes a moment to initialise.

---

## Part 9 — Install ArgoCD

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

You will see a long list of resources being created. You may also see this error — it is safe to ignore:

```
The CustomResourceDefinition "applicationsets.argoproj.io" is invalid:
metadata.annotations: Too long: may not be more than 262144 bytes
```

This is a known kubectl limitation with large CRDs. It does not affect this project.

Wait for ArgoCD server to be fully ready (takes 2-3 minutes):

```bash
kubectl wait --for=condition=available deployment/argocd-server -n argocd --timeout=180s
```

Expected output:

```
deployment.apps/argocd-server condition met
```

Verify all ArgoCD pods are running:

```bash
kubectl get pods -n argocd
```

All pods should show `Running` or `Completed`.

---

## Part 10 — Register the applications with ArgoCD

```bash
kubectl apply -f argocd/application-dev.yaml
kubectl apply -f argocd/application-prod.yaml
```

Expected output:

```
application.argoproj.io/autonomous-release-dev created
application.argoproj.io/autonomous-release-prod created
```

ArgoCD will immediately start syncing both apps. It will create the `dev` and `prod` namespaces automatically.

---

## Part 11 — Create the GHCR image pull secret

The Kubernetes cluster needs credentials to pull private images from GHCR.

**Create a GitHub PAT:**

1. Go to `github.com` → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click **Generate new token (classic)**
3. Set a name (e.g. `k8s-ghcr-pull`)
4. Set expiry as needed
5. Tick only `read:packages`
6. Click **Generate token** and copy the value immediately

**Create the secret in both namespaces:**

```bash
kubectl create secret docker-registry ghcr-pull-secret \
  --docker-server=ghcr.io \
  --docker-username=<your-github-username> \
  --docker-password=<your-PAT> \
  -n dev

kubectl create secret docker-registry ghcr-pull-secret \
  --docker-server=ghcr.io \
  --docker-username=<your-github-username> \
  --docker-password=<your-PAT> \
  -n prod
```

Expected output for each:

```
secret/ghcr-pull-secret created
```

> If you get `namespaces "dev" not found`, ArgoCD hasn't created the namespace yet. Wait 30 seconds and try again.

---

## Part 12 — Open the ArgoCD UI

Start the port-forward (keep this terminal open):

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

Get the admin password:

```bash
kubectl get secret argocd-initial-admin-secret -n argocd \
  -o jsonpath="{.data.password}" | base64 -d && echo
```

Open in your Windows browser: `https://localhost:8080`

Login:
- **Username:** `admin`
- **Password:** output from the command above

> Your browser will show a certificate warning — click **Advanced** → **Proceed**. This is expected for a local self-signed certificate.

---

## Part 13 — Verify everything is running

Check pods in dev namespace:

```bash
kubectl get pods -n dev
```

Expected (1 pod):

```
NAME                                          READY   STATUS    RESTARTS   AGE
dev-autonomous-release-app-xxxxxxxxx-xxxxx    1/1     Running   0          2m
```

Check pods in prod namespace:

```bash
kubectl get pods -n prod
```

Expected (3 pods):

```
NAME                                           READY   STATUS    RESTARTS   AGE
prod-autonomous-release-app-xxxxxxxxx-xxxxx    1/1     Running   0          2m
prod-autonomous-release-app-xxxxxxxxx-xxxxx    1/1     Running   0          2m
prod-autonomous-release-app-xxxxxxxxx-xxxxx    1/1     Running   0          2m
```

In the ArgoCD UI both apps should show:
- **App Health:** Healthy
- **Sync Status:** Synced

---

## Part 14 — Test the full GitOps loop

Make any small change to the app:

```bash
# open the server file and edit something small
nano app/src/server.js
```

Commit and push:

```bash
git add app/src/server.js
git commit -m "test: trigger full GitOps loop"
git push origin main
```

Watch what happens:

1. **GitHub Actions** — go to your repo → **Actions** tab → watch the CI pipeline run
2. **Git** — after CI finishes, a new commit appears from `github-actions[bot]` with message `ci: update image tag to sha-xxxxxxx [skip ci]`
3. **ArgoCD UI** — app briefly shows `OutOfSync` then `Synced` automatically
4. **Pods** — watch the rolling update in the terminal:

```bash
kubectl get pods -n dev -w
```

You will see new pods come up and old pods terminate.

---

## Reference Commands

### Pods and deployments

```bash
# list pods in dev
kubectl get pods -n dev

# list pods in prod
kubectl get pods -n prod

# watch pods update in real time
kubectl get pods -n dev -w
kubectl get pods -n prod -w

# see which image tag is currently running
kubectl get deployment -n dev -o wide
kubectl get deployment -n prod -o wide

# see detailed info about a pod (useful for debugging)
kubectl describe pod <pod-name> -n dev

# see logs from a running pod
kubectl logs <pod-name> -n dev

# see logs and follow live
kubectl logs -f <pod-name> -n dev
```

### ArgoCD

```bash
# list all ArgoCD applications
kubectl get applications -n argocd

# see ArgoCD app status in detail
kubectl describe application autonomous-release-dev -n argocd
kubectl describe application autonomous-release-prod -n argocd

# restart port-forward if it drops
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

### Cluster management

```bash
# list all clusters
kind get clusters

# delete the cluster when done
kind delete cluster --name argo-platform

# recreate it
kind create cluster --name argo-platform
```

### Secrets

```bash
# verify pull secret exists
kubectl get secret ghcr-pull-secret -n dev
kubectl get secret ghcr-pull-secret -n prod

# delete and recreate pull secret (e.g. after PAT rotation)
kubectl delete secret ghcr-pull-secret -n dev
kubectl delete secret ghcr-pull-secret -n prod

kubectl create secret docker-registry ghcr-pull-secret \
  --docker-server=ghcr.io \
  --docker-username=<your-github-username> \
  --docker-password=<new-PAT> \
  -n dev

kubectl create secret docker-registry ghcr-pull-secret \
  --docker-server=ghcr.io \
  --docker-username=<your-github-username> \
  --docker-password=<new-PAT> \
  -n prod
```

---

## Troubleshooting

### Error: `permission_denied: write_package` in GitHub Actions

```
ERROR: failed to build: denied: permission_denied: write_package
```

**Cause:** The GHCR package exists but is not linked to your repository. `GITHUB_TOKEN` can only push to packages that are explicitly linked.

**Fix:**
1. Go to GitHub → your profile → Packages → `autonomous-release-platform`
2. Package settings → Manage Actions access → Add repository
3. Select your repo → set role to **Write**
4. Re-run the failed workflow

---

### Error: `ImagePullBackOff` or `ErrImagePull`

```bash
kubectl get pods -n dev
# NAME     READY   STATUS             RESTARTS
# pod-xxx  0/1     ImagePullBackOff   0
```

Get the exact error:

```bash
kubectl describe pod <pod-name> -n dev | grep -A10 "Events:"
```

**If you see `401 Unauthorized`:**

```
failed to authorize: failed to fetch anonymous token: unexpected status ... 401 Unauthorized
```

Cause: The cluster has no credentials to pull from private GHCR.

Fix: Create the pull secret (Part 11 above).

**If you see `manifest unknown` or `not found`:**

Cause: The image tag in the kustomization.yaml does not exist in GHCR yet. GitHub Actions hasn't run or failed before pushing.

Fix: Check the Actions tab — re-run the failed workflow.

---

### Error: `namespaces "dev" not found` when creating pull secret

```
Error from server (NotFound): namespaces "dev" not found
```

**Cause:** ArgoCD hasn't had time to create the namespace yet after registering the apps.

**Fix:** Wait 30 seconds and run the command again. ArgoCD creates namespaces during its first sync.

---

### Node stuck on `NotReady`

```bash
kubectl get nodes
# NAME                          STATUS     ROLES
# argo-platform-control-plane   NotReady   control-plane
```

**Cause:** The CNI (network plugin) is still initialising after cluster creation.

**Fix:** Wait 30 seconds and check again. It always becomes Ready within a minute.

---

### Error: `applicationsets.argoproj.io` CRD invalid during ArgoCD install

```
The CustomResourceDefinition "applicationsets.argoproj.io" is invalid:
metadata.annotations: Too long: may not be more than 262144 bytes
```

**Cause:** A known kubectl limitation — the `last-applied-configuration` annotation exceeds 262KB for this large CRD.

**Fix:** This is safe to ignore. The CRD is still created. This project uses `Application` resources, not `ApplicationSet`, so this does not affect anything.

---

### ArgoCD `wait` command times out

```
timed out waiting for the condition
```

**Cause:** ArgoCD pods are taking longer than 180 seconds to start, usually because of slow image pulls.

**Fix:** Check pod status:

```bash
kubectl get pods -n argocd
```

If pods are `Pending` or `ContainerCreating`, just wait and re-run the wait command with a longer timeout:

```bash
kubectl wait --for=condition=available deployment/argocd-server -n argocd --timeout=300s
```

---

### Port-forward drops or stops working

**Cause:** The terminal was closed, the connection timed out, or the pod restarted.

**Fix:** Re-run in a new terminal:

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

---

### Docker not running in WSL

```
Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

**Cause:** Docker service is not started (common in WSL without Docker Desktop).

**Fix:**

```bash
sudo service docker start
```

Or if using Docker Desktop, make sure it is running on Windows and WSL integration is enabled.

---

### kind command not found

```
Command 'kind' not found
```

**Fix:** Reinstall kind (Part 4 above), or check it is in your PATH:

```bash
which kind
echo $PATH
```

If `/usr/local/bin` is not in `$PATH`, add it:

```bash
echo 'export PATH=$PATH:/usr/local/bin' >> ~/.bashrc
source ~/.bashrc
```

---

### ArgoCD app stuck on `Progressing` and never becomes `Healthy`

**Cause:** Pods are not passing the readiness probe (`GET /ready` on port 8080).

**Fix:** Check what is wrong with the pods:

```bash
kubectl get pods -n dev
kubectl describe pod <pod-name> -n dev
kubectl logs <pod-name> -n dev
```

Look for crash errors or failed health check messages in the logs.
