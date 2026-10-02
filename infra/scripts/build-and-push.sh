#!/usr/bin/env bash
# Manual build+push, run from a developer machine. No CI/CD wired up on purpose.
set -euo pipefail

TAG="${1:?Usage: build-and-push.sh <tag>}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REGISTRY="ghcr.io/ap-education"

WEB_BUILD_ENV="$REPO_ROOT/infra/docker/web-build.env"
if [[ -f "$WEB_BUILD_ENV" ]]; then
  # shellcheck disable=SC1090
  source "$WEB_BUILD_ENV"
fi

echo "==> Building ${REGISTRY}/ap-connect-api:${TAG}"
docker build \
  -f "$REPO_ROOT/infra/docker/Dockerfile.api" \
  -t "${REGISTRY}/ap-connect-api:${TAG}" \
  "$REPO_ROOT"

echo "==> Building ${REGISTRY}/ap-connect-web:${TAG}"
docker build \
  -f "$REPO_ROOT/infra/docker/Dockerfile.web" \
  --build-arg VITE_OIDC_ISSUER="${VITE_OIDC_ISSUER:-}" \
  --build-arg VITE_OIDC_CLIENT_ID="${VITE_OIDC_CLIENT_ID:-}" \
  --build-arg VITE_OIDC_AUDIENCE="${VITE_OIDC_AUDIENCE:-}" \
  --build-arg VITE_IMAGES_URL="${VITE_IMAGES_URL:-}" \
  -t "${REGISTRY}/ap-connect-web:${TAG}" \
  "$REPO_ROOT"

echo "==> Pushing (requires: docker login ghcr.io -u <user>)"
docker push "${REGISTRY}/ap-connect-api:${TAG}"
docker push "${REGISTRY}/ap-connect-web:${TAG}"
