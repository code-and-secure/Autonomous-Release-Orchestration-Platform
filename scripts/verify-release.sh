#!/usr/bin/env sh
set -eu

NAMESPACE=${1:-prod}
APP_LABEL=${2:-app=autonomous-release-app}

printf "Checking rollout status in namespace %s\n" "$NAMESPACE"
kubectl rollout status deployment -n "$NAMESPACE" -l "$APP_LABEL" --timeout=120s

printf "Checking pod health for label %s\n" "$APP_LABEL"
kubectl get pods -n "$NAMESPACE" -l "$APP_LABEL"

printf "Release verification completed successfully.\n"
