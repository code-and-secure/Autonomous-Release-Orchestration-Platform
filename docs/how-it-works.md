# How It Works

This document explains what happens from the moment a developer pushes code to the moment a new version is running in Kubernetes.

---

## The Big Picture

This project uses a pattern called **GitOps**. The rule is simple:

> Git is the single source of truth. The cluster always matches what is in the repository.

No one manually runs `kubectl apply` to deploy. No one SSHs into a server. Everything is driven by code changes in Git.

---

## The Two Halves

| Half | Tool | Job |
|---|---|---|
| CI (Continuous Integration) | GitHub Actions | Build, test, package the app |
| CD (Continuous Deployment) | ArgoCD | Watch Git, sync the cluster |

They are intentionally separate. GitHub Actions never touches the cluster. ArgoCD never builds images. Each tool does one job only.

---

## Step-by-Step: What Happens on Every `git push` to `main`

### 1. Developer pushes code

```
git push origin main
```

GitHub receives the push and immediately triggers the CI workflow at `.github/workflows/ci.yml`.

---

### 2. GitHub Actions: Install and Test

```
npm ci        → installs exact dependencies from package-lock.json
npm test      → runs all tests in app/tests/
```

If tests fail, the pipeline stops here. Nothing gets deployed. The cluster is untouched.

---

### 3. GitHub Actions: Build and Push Docker Image

The app is packaged into a Docker image using `docker/Dockerfile`.

The image is pushed to **GHCR (GitHub Container Registry)** with two tags:

| Tag | Example | Purpose |
|---|---|---|
| Short SHA | `sha-901bc54` | Immutable, unique per commit |
| latest | `latest` | Floating pointer to newest build |

The SHA tag is what ArgoCD will deploy. It never changes — you can always trace exactly which commit is running in the cluster.

---

### 4. GitHub Actions: Update Git Manifests

This is the key step that connects CI to CD.

GitHub Actions patches the `newTag` field in both Kustomize overlays:

```
k8s/overlays/dev/kustomization.yaml   → newTag: sha-901bc54
k8s/overlays/prod/kustomization.yaml  → newTag: sha-901bc54
```

Then it commits and pushes that change back to `main`:

```
Author:  github-actions[bot]
Message: ci: update image tag to sha-901bc54 [skip ci]
```

The `[skip ci]` marker tells GitHub Actions not to re-trigger on this commit, preventing an infinite loop.

---

### 5. ArgoCD: Detects the Manifest Change

ArgoCD continuously polls the repository every 3 minutes (default). When it sees a new commit on `main`, it compares:

- **Desired state** — what the Git manifests say should be running
- **Live state** — what is actually running in the cluster

If they differ, ArgoCD marks the app as **OutOfSync** and begins a sync automatically (because `automated: true` is set in both `argocd/application-dev.yaml` and `argocd/application-prod.yaml`).

---

### 6. Kubernetes: Rolling Deployment

ArgoCD applies the updated manifests to the cluster. Kubernetes performs a **rolling update**:

1. Starts new pods with the new image (`sha-901bc54`)
2. Waits for new pods to pass the **readiness probe** (`GET /ready` on port 8080)
3. Only then terminates old pods

This means zero downtime. The app stays live during the entire rollout.

If the new pods never become ready (crash, bad image, failed health check), Kubernetes stops the rollout and old pods keep serving traffic.

---

### 7. ArgoCD: Reports Healthy

Once all pods are running and passing health checks, ArgoCD marks the app:

- **Sync Status: Synced** — Git and cluster match
- **App Health: Healthy** — all pods are live

---

## Full Flow Diagram

```
Developer
    │
    │  git push origin main
    ▼
GitHub
    │
    │  triggers workflow
    ▼
GitHub Actions (.github/workflows/ci.yml)
    ├── npm ci + npm test
    ├── docker build
    ├── docker push → ghcr.io/code-and-secure/autonomous-release-platform:sha-XXXXXXX
    └── sed patch newTag in k8s/overlays/dev + prod
         └── git commit + git push → main
                  │
                  │  ArgoCD polls repo every 3 min
                  ▼
             ArgoCD detects new commit
                  │
                  │  desired ≠ live → sync
                  ▼
             kubectl apply (via Kustomize)
                  │
                  ▼
         Kubernetes rolling update
             ├── new pods start
             ├── readiness probe passes
             └── old pods terminate
                  │
                  ▼
          App Health: Healthy
          Sync Status: Synced
```

---

## Environment Separation

There are two environments, each with its own Kustomize overlay:

| Environment | Namespace | Replicas | Overlay path |
|---|---|---|---|
| dev | `dev` | 1 pod | `k8s/overlays/dev` |
| prod | `prod` | 3 pods | `k8s/overlays/prod` |

Both get the same image tag on every push. The base manifests (`k8s/base/`) are shared. Only replica count, namespace, and name prefix differ between environments.

---

## Key Files

| File | What it does |
|---|---|
| `.github/workflows/ci.yml` | Defines the full CI pipeline |
| `k8s/base/deployment.yaml` | Base Kubernetes Deployment (shared by dev and prod) |
| `k8s/overlays/dev/kustomization.yaml` | Patches for dev (1 replica, dev namespace, image tag) |
| `k8s/overlays/prod/kustomization.yaml` | Patches for prod (3 replicas, prod namespace, image tag) |
| `argocd/application-dev.yaml` | Tells ArgoCD to watch `k8s/overlays/dev` and sync to `dev` namespace |
| `argocd/application-prod.yaml` | Tells ArgoCD to watch `k8s/overlays/prod` and sync to `prod` namespace |
| `docker/Dockerfile` | Defines how the app is packaged into an image |
