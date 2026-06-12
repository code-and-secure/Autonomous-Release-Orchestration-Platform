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

## Part 15 — Install Helm

Helm is the package manager for Kubernetes. It is used to install the monitoring stack in one command.

Check if Helm is already installed:

```bash
helm version
```

If not installed:

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
helm version
```

Expected output:

```
version.BuildInfo{Version:"v3.xx.x", ...}
```

---

## Part 16 — Install the monitoring stack

The monitoring stack installs Prometheus, Grafana, and Alertmanager together using a single Helm chart.

Add the Helm repository:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

Install the stack using the config from this repo:

```bash
helm upgrade --install monitor prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace \
  -f monitoring/prometheus-values.yaml
```

Expected output:

```
Release "monitor" does not exist. Installing it now.
NAME: monitor
LAST DEPLOYED: ...
NAMESPACE: monitoring
STATUS: deployed
REVISION: 1
```

Wait for all pods to be ready (takes 2-3 minutes):

```bash
kubectl get pods -n monitoring -w
```

You are waiting for all pods to show `Running`. Press `Ctrl+C` when done.

Expected final state:

```
NAME                                                   READY   STATUS    RESTARTS
alertmanager-monitor-kube-prometheus-st-alertmanager-0 2/2     Running   0
monitor-grafana-xxxxxxxxx-xxxxx                        3/3     Running   0
monitor-kube-prometheus-st-operator-xxxxxxxxx-xxxxx    1/1     Running   0
monitor-kube-state-metrics-xxxxxxxxx-xxxxx             1/1     Running   0
monitor-prometheus-node-exporter-xxxxx                 1/1     Running   0
prometheus-monitor-kube-prometheus-st-prometheus-0     2/2     Running   0
```

Verify all are running:

```bash
kubectl get pods -n monitoring
```

---

## Part 17 — Open Grafana

Start the port-forward in a dedicated terminal (keep it running):

```bash
kubectl port-forward svc/monitor-grafana -n monitoring 3000:80
```

Open in your Windows browser: `http://localhost:3000`

Get the Grafana admin password:

```bash
kubectl get secret --namespace monitoring monitor-grafana \
  -o jsonpath="{.data.admin-password}" | base64 -d && echo
```

Login with:
- **Username:** `admin`
- **Password:** output from the command above (default is `admin` if unchanged in prometheus-values.yaml)

---

## Part 18 — Import the release health dashboard

The dashboard JSON is already in the repo at `monitoring/grafana-dashboard-release.json`. It has 13 panels covering pods, CPU, memory, restarts, replicas, and node metrics.

**Steps to import:**

1. In Grafana, click the **+** icon in the top-right → **Import dashboard**
2. Click **Upload JSON file**
3. Navigate to your repo folder and select `monitoring/grafana-dashboard-release.json`
4. Click **Import**

**What each panel shows:**

| Panel | Type | What it tracks |
|---|---|---|
| Running Pods (dev + prod) | Stat | Total pods in Running phase across both namespaces |
| Dev Pods Running | Stat | Pods running in dev namespace only |
| Prod Pods Running | Stat | Pods running in prod namespace only |
| Total Container Restarts | Stat | Cumulative restart count — goes red at 5+ |
| CPU Usage by Namespace | Timeseries | CPU % consumed by dev and prod containers |
| Memory Usage by Namespace | Timeseries | Memory bytes used by dev and prod containers |
| Pod Restarts Over Time | Timeseries | Restart rate per pod — spikes indicate crash loops |
| HTTP Success Rate | Timeseries | % of 2xx responses (requires app to expose metrics) |
| Dev — Available vs Desired | Gauge | % of desired replicas that are available in dev |
| Prod — Available vs Desired | Gauge | % of desired replicas that are available in prod |
| Pod Status Breakdown | Table | All pods with namespace, name, and phase colour coded |
| Node CPU Usage | Timeseries | Overall node CPU % (not just app containers) |
| Node Memory Available | Timeseries | Node-level free vs total memory |

**Colour thresholds:**
- Green = healthy
- Yellow = degraded / warning
- Red = critical

---

## Part 19 — Open Prometheus (optional)

Prometheus is the data source behind Grafana. You can query metrics directly here.

```bash
kubectl port-forward svc/monitor-kube-prometheus-st-prometheus -n monitoring 9090:9090
```

Open: `http://localhost:9090`

Useful queries to try:

```promql
# all running pods in dev and prod
kube_pod_status_phase{namespace=~"dev|prod", phase="Running"}

# container restart count
kube_pod_container_status_restarts_total{namespace=~"dev|prod"}

# available replicas in prod
kube_deployment_status_replicas_available{namespace="prod"}

# node CPU usage percentage
(1 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m]))) * 100
```

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

### Monitoring

```bash
# check all monitoring pods
kubectl get pods -n monitoring

# watch monitoring pods in real time
kubectl get pods -n monitoring -w

# open Grafana (run in a dedicated terminal)
kubectl port-forward svc/monitor-grafana -n monitoring 3000:80

# open Prometheus (run in a dedicated terminal)
kubectl port-forward svc/monitor-kube-prometheus-st-prometheus -n monitoring 9090:9090

# open Alertmanager (run in a dedicated terminal)
kubectl port-forward svc/monitor-kube-prometheus-st-alertmanager -n monitoring 9093:9093

# get Grafana admin password
kubectl get secret --namespace monitoring monitor-grafana \
  -o jsonpath="{.data.admin-password}" | base64 -d && echo

# check Helm releases
helm list -n monitoring

# upgrade monitoring stack after changes to prometheus-values.yaml
helm upgrade --install monitor prometheus-community/kube-prometheus-stack \
  -n monitoring \
  -f monitoring/prometheus-values.yaml

# uninstall monitoring stack completely
helm uninstall monitor -n monitoring

# check Prometheus targets (what it is scraping)
# open http://localhost:9090/targets after port-forwarding Prometheus
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

### Monitoring pods stuck on `Pending` or `ContainerCreating`

```bash
kubectl get pods -n monitoring
# NAME                          READY   STATUS              RESTARTS
# monitor-grafana-xxx           0/3     ContainerCreating   0
```

**Cause:** Images are still being pulled from Docker Hub. The kube-prometheus-stack pulls many images on first install.

**Fix:** Wait 3-5 minutes. Check progress:

```bash
kubectl describe pod <pod-name> -n monitoring | grep -A5 "Events:"
```

If a pod is stuck on `Pending` with no events, the node may be out of resources:

```bash
kubectl describe node argo-platform-control-plane | grep -A10 "Allocated resources"
```

---

### Grafana port-forward works but browser shows blank page

**Cause:** Grafana is still initialising even though the pod shows `Running`.

**Fix:** Wait 30 seconds and refresh. If still blank, check Grafana logs:

```bash
kubectl logs -n monitoring -l app.kubernetes.io/name=grafana -c grafana
```

---

### Grafana dashboard shows `No data` on all panels

**Cause:** Either Prometheus has not scraped the metrics yet, or the namespace filter `dev|prod` does not match anything.

**Fix — check Prometheus is scraping your namespaces:**

```bash
kubectl port-forward svc/monitor-kube-prometheus-st-prometheus -n monitoring 9090:9090
```

Open `http://localhost:9090/targets` and confirm targets are green.

**Fix — verify metrics exist in Prometheus:**

Go to `http://localhost:9090`, enter this query and click Execute:

```promql
kube_pod_status_phase{namespace=~"dev|prod"}
```

If no results, kube-state-metrics may not be running:

```bash
kubectl get pods -n monitoring | grep kube-state-metrics
```

---

### `helm: command not found`

```
bash: helm: command not found
```

**Fix:** Install Helm (Part 15 above):

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

---

### `helm upgrade` fails with `release not found` or repo errors

```
Error: repo prometheus-community not found
```

**Fix:** Add the repo first:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

Then re-run the install command.

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
