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

## 2) Tag and push container image to registry

```bash
docker tag local/autonomous-release-platform:dev ghcr.io/<your-username>/autonomous-release-platform:dev
docker login ghcr.io -u <your-username>
docker push ghcr.io/<your-username>/autonomous-release-platform:dev
```

## 3) Deploy that container image to Kubernetes

Update these files with your image path:

- k8s/base/deployment.yaml
- k8s/overlays/dev/kustomization.yaml
- k8s/overlays/prod/kustomization.yaml

Then deploy:

```bash
kind create cluster --name aro-platform
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

## 6) CI-friendly Dockerized commands

Use these in pipelines:

```bash
docker build -f docker/Dockerfile -t ghcr.io/<your-username>/autonomous-release-platform:${GIT_SHA} app
docker push ghcr.io/<your-username>/autonomous-release-platform:${GIT_SHA}
```

## Troubleshooting

1. Container starts but app not reachable
- Confirm port mapping uses 8080:8080.

2. Kubernetes deploy uses old image
- Update tag and re-apply overlay.

3. Image pull backoff
- Ensure pushed image is public or cluster has pull credentials.
