# DevOps Learning Path With This Project

## Stage 1: CI fundamentals

- Understand what happens on every push.
- Read `.github/workflows/ci.yml`.
- Break tests intentionally and observe pipeline behavior.

## Stage 2: Containerization

- Build image using `docker/Dockerfile`.
- Tag with commit SHA.
- Push to GHCR.

## Stage 3: Kubernetes deployments

- Apply `k8s/base` and then overlays.
- Compare dev and prod differences.
- Practice rollout and rollback.

## Stage 4: GitOps with ArgoCD

- Configure ArgoCD application specs.
- Change manifest image tag and let ArgoCD sync.
- Observe self-heal behavior.

## Stage 5: Observability and release verification

- Install Prometheus and Grafana stack.
- Monitor pod restarts and success rate.
- Define release SLOs and alert rules.

## Stage 6: Incident handling

- Trigger a bad release.
- Use `scripts/rollback.sh`.
- Add Slack notifications for alerting.
