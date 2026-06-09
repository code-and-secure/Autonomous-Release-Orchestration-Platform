# Deployment Guide for Linux

This guide is for Ubuntu, Debian, Fedora, and other Linux environments.

## Prerequisites

- Docker Engine
- Node.js 20+
- kubectl
- kind or minikube
- helm
- argocd CLI
- curl

## 1) Clone and test

```bash
git clone https://github.com/<your-username>/autonomous-release-orchestration-platform.git
cd autonomous-release-orchestration-platform/app
npm ci
npm test
npm start
```

Check health:

```bash
curl http://localhost:8080/health
```

## 2) Build and push Docker image (GHCR)

```bash
cd ..
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

```bash
kind create cluster --name aro-platform
kubectl create namespace dev
kubectl create namespace prod
```

## 5) Deploy with Kustomize

```bash
kubectl apply -k k8s/overlays/dev
kubectl apply -k k8s/overlays/prod
kubectl get deploy,svc,pods -n dev
kubectl get deploy,svc,pods -n prod
```

## 6) Install ArgoCD

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Update repo URL in:

- argocd/application-dev.yaml
- argocd/application-prod.yaml

Apply apps:

```bash
kubectl apply -f argocd/application-dev.yaml
kubectl apply -f argocd/application-prod.yaml
```

## 7) Install monitoring

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm upgrade --install monitor prometheus-community/kube-prometheus-stack -n monitoring --create-namespace -f monitoring/prometheus-values.yaml
```

## 8) Verify and rollback

```bash
sh scripts/verify-release.sh prod app=autonomous-release-app
sh scripts/rollback.sh prod prod-autonomous-release-app
```

## Troubleshooting

1. Permission denied on scripts
```bash
chmod +x scripts/verify-release.sh scripts/rollback.sh
```

2. Docker permission issue
- Add user to docker group or run with sudo.

3. Image pull error
- Recheck image path and tag in overlays.
