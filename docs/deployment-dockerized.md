# Deployment Guide for Dockerized Workflow

Use this guide when you want to run the app in containers first, then deploy the same image to Kubernetes.

## Prerequisites

- Docker Desktop or Docker Engine
- kubectl
- kind or minikube
- helm
- argocd CLI

## 1) Build and run app as container only

```bash
docker build -f docker/Dockerfile -t local/autonomous-release-platform:dev app
docker run --rm -p 8080:8080 local/autonomous-release-platform:dev
```

Health check:

- http://localhost:8080/health

Stop container with Ctrl+C.

## 2) Prepare image for local Kubernetes

```bash
kind create cluster --name aro-platform
kind load docker-image local/autonomous-release-platform:dev --name aro-platform
```

## 3) Deploy that container image to Kubernetes

Update these files with your image path:

- k8s/base/deployment.yaml
- k8s/overlays/dev/kustomization.yaml
- k8s/overlays/prod/kustomization.yaml

Then deploy:

```bash
kubectl create namespace dev
kubectl apply -k k8s/overlays/dev
kubectl get pods -n dev
```

## 4) Optional full GitOps setup with ArgoCD

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl apply -f argocd/application-dev.yaml
```

ArgoCD will keep Kubernetes in sync with your Git repository state.

## 5) Optional monitoring stack

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm upgrade --install monitor prometheus-community/kube-prometheus-stack -n monitoring --create-namespace -f monitoring/prometheus-values.yaml
```

## 6) Optional CI-friendly registry commands

Use these in pipelines:

```bash
docker build -f docker/Dockerfile -t ghcr.io/<your-username>/autonomous-release-platform:${GIT_SHA} app
docker push ghcr.io/<your-username>/autonomous-release-platform:${GIT_SHA}
```

## 7) Jenkins + GHCR deployment path

1. In Jenkins, configure credential `ghcr-creds` with:
- Username: your GitHub username (or org owner user)
- Password: GitHub PAT with `write:packages` and `read:packages`

2. Run pipeline on `main` branch.
- Jenkins builds image from `docker/Dockerfile`.
- Jenkins pushes two tags to GHCR:
	- commit SHA tag (for traceability)
	- `latest` (for simple environments)

3. Point Kubernetes manifests to GHCR image path:
- `ghcr.io/<your-username-or-org>/autonomous-release-platform:<tag>`

4. If your package is private, create image pull secret:

```bash
kubectl create secret docker-registry ghcr-creds \
	--docker-server=ghcr.io \
	--docker-username=<your-github-username> \
	--docker-password=<your-github-pat> \
	--docker-email=<your-email> \
	-n dev
```

Attach secret in deployment service account or pod spec for each namespace.

## Troubleshooting

1. Container starts but app not reachable
- Confirm port mapping uses 8080:8080.

2. Kubernetes deploy uses old image
- Update tag and re-apply overlay.

3. Image pull backoff
- Ensure manifests reference `local/autonomous-release-platform:dev` for local clusters.
- Re-run `kind load docker-image local/autonomous-release-platform:dev --name aro-platform` after rebuilding.

4. GHCR push fails in Jenkins
- Verify Jenkins credential id is exactly `ghcr-creds`.
- Confirm PAT has package scopes and SSO authorization (if org enforces SSO).
- Confirm `GITHUB_ORG` resolves correctly in Jenkins logs.
