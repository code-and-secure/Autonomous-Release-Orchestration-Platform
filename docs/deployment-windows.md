# Deployment Guide for Windows

This guide is for Windows 10/11 using PowerShell.

## Prerequisites

- Docker Desktop
- Node.js 20+
- kubectl
- kind or minikube
- helm
- argocd CLI

## 1) Clone and test

```powershell
git clone https://github.com/<your-username>/autonomous-release-orchestration-platform.git
Set-Location autonomous-release-orchestration-platform\app
npm.cmd ci
npm.cmd test
npm.cmd start
```

Check health in browser:

- http://localhost:8080/health

## 2) Build and push Docker image (GHCR)

```powershell
Set-Location ..
docker build -f docker/Dockerfile -t ghcr.io/<your-username>/autonomous-release-platform:dev app
docker login ghcr.io -u <your-username>
docker push ghcr.io/<your-username>/autonomous-release-platform:dev
```

## 3) Update manifests with your image

Update image path in:

- k8s/base/deployment.yaml
- k8s/overlays/dev/kustomization.yaml
- k8s/overlays/prod/kustomization.yaml

Use:

- ghcr.io/<your-username>/autonomous-release-platform

## 4) Create local Kubernetes cluster

```powershell
kind create cluster --name aro-platform
kubectl create namespace dev
kubectl create namespace prod
```

## 5) Deploy with Kustomize

```powershell
kubectl apply -k k8s/overlays/dev
kubectl apply -k k8s/overlays/prod
kubectl get deploy,svc,pods -n dev
kubectl get deploy,svc,pods -n prod
```

## 6) Install ArgoCD

```powershell
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Update repo URL in:

- argocd/application-dev.yaml
- argocd/application-prod.yaml

Apply apps:

```powershell
kubectl apply -f argocd/application-dev.yaml
kubectl apply -f argocd/application-prod.yaml
```

## 7) Install monitoring

```powershell
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm upgrade --install monitor prometheus-community/kube-prometheus-stack -n monitoring --create-namespace -f monitoring/prometheus-values.yaml
```

## 8) Verify and rollback

If you have Git Bash or WSL:

```powershell
sh scripts/verify-release.sh prod app=autonomous-release-app
sh scripts/rollback.sh prod prod-autonomous-release-app
```

If you only use PowerShell, run equivalent commands:

```powershell
kubectl rollout status deployment -n prod -l app=autonomous-release-app --timeout=120s
kubectl get pods -n prod -l app=autonomous-release-app
kubectl rollout undo deployment prod-autonomous-release-app -n prod
kubectl rollout status deployment prod-autonomous-release-app -n prod --timeout=120s
```

## Troubleshooting

1. npm execution policy issue
- Use npm.cmd instead of npm in PowerShell.

2. kind not found
- Restart terminal after installation and verify with kind --version.

3. Script files not executable
- Use the PowerShell command equivalents shown above.
