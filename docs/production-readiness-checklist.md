# Production Readiness Checklist

Use this checklist before deploying to a real production environment.

## 1) Security

- Use private registry access with least privilege.
- Rotate tokens and webhook secrets.
- Do not store secrets in Git.
- Enable image vulnerability scanning.
- Use signed images if possible.

## 2) Kubernetes hardening

- Add resource requests and limits for all containers.
- Add PodDisruptionBudgets for critical workloads.
- Add NetworkPolicies for namespace isolation.
- Use separate dev, staging, and prod namespaces.
- Enable RBAC with minimum required permissions.

## 3) Release safety

- Use immutable image tags (commit SHA).
- Gate production deploys with required checks.
- Add manual approval for production sync if needed.
- Define rollback runbook and test it monthly.
- Track deployment frequency and change failure rate.

## 4) Observability

- Define SLOs for latency and availability.
- Add alerts for error rate, restart spikes, and saturation.
- Ensure logs are centralized and searchable.
- Create dashboards for release health and service health.

## 5) Reliability and scale

- Configure horizontal pod autoscaling.
- Test node failure and pod rescheduling.
- Perform load testing before peak events.
- Validate readiness and liveness probes under load.

## 6) Backup and disaster recovery

- Document RTO and RPO targets.
- Back up critical configuration and persistent data.
- Run disaster recovery drills quarterly.
- Validate restore procedures end to end.

## 7) Compliance and operations

- Keep audit trail for who deployed what and when.
- Define on-call ownership and escalation policy.
- Document incident response workflow.
- Keep architecture and runbooks updated.

## 8) Public repository hygiene

- Add LICENSE, CODE_OF_CONDUCT, and CONTRIBUTING files.
- Add clear issue templates and security policy.
- Remove any sensitive sample values.
- Keep setup and deployment docs current.
