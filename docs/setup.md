# Setup Guide

For complete deployment instructions, also read [docs/deployment-guide.md](docs/deployment-guide.md).

## Prerequisites

- GitHub repository with this code
- Docker Desktop or Docker Engine
- Node.js 20+
- kubectl
- kind or minikube
- helm
- argocd CLI

## 1) Run app locally

```bash
cd app
npm ci
npm test
npm start
```

Visit `http://localhost:8080/health`.

## 2) Build container image

```bash
docker build -f docker/Dockerfile -t local/autonomous-release:dev app
```

## 3) Start local Kubernetes cluster

```bash
kind create cluster --name aro-platform
kubectl create namespace dev
kubectl create namespace prod
```

## 4) Deploy using Kustomize overlays

```bash
kubectl apply -k k8s/overlays/dev
kubectl apply -k k8s/overlays/prod
```

## 5) Install ArgoCD

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl apply -f argocd/application-dev.yaml
kubectl apply -f argocd/application-prod.yaml
```

## 6) Install monitoring stack

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm upgrade --install monitor prometheus-community/kube-prometheus-stack -n monitoring --create-namespace -f monitoring/prometheus-values.yaml
```

## 7) Verify release

```bash
sh scripts/verify-release.sh prod app=autonomous-release-app
```
