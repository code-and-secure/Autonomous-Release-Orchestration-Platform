# Deployment Guide

Use this page to choose the deployment path for your environment.

## Choose your guide

1. Linux users: [docs/deployment-linux.md](docs/deployment-linux.md)
2. Windows users (PowerShell): [docs/deployment-windows.md](docs/deployment-windows.md)
3. Dockerized workflow (container-first): [docs/deployment-dockerized.md](docs/deployment-dockerized.md)

## Which one should you pick

- Choose Linux if your development machine or server is Linux.
- Choose Windows if you are using Docker Desktop and PowerShell.
- Choose Dockerized if you want to run container-first and then move to Kubernetes.

## Common post-deployment steps

After any deployment path:

1. Verify release health with scripts in scripts/.
2. Configure Slack webhook in GitHub secrets for notifications.
3. Review [docs/production-readiness-checklist.md](docs/production-readiness-checklist.md) before real production usage.
