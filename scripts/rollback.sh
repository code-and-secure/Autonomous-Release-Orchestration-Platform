#!/usr/bin/env sh
set -eu

NAMESPACE=${1:-prod}
DEPLOYMENT=${2:-prod-autonomous-release-app}

printf "Rolling back deployment %s in namespace %s\n" "$DEPLOYMENT" "$NAMESPACE"
kubectl rollout undo deployment "$DEPLOYMENT" -n "$NAMESPACE"
kubectl rollout status deployment "$DEPLOYMENT" -n "$NAMESPACE" --timeout=120s

printf "Rollback complete.\n"
