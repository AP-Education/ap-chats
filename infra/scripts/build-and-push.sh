#!/usr/bin/env bash
# Manual build+push, run from a developer machine. No CI/CD wired up on purpose.
set -euo pipefail

TAG="${1:?Usage: build-and-push.sh <tag>}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REGISTRY="ghcr.io/ap-education"
# The default DigitalOcean droplet runs x86_64, including when built on an ARM Mac.
BUILD_PLATFORM="${DOCKER_BUILD_PLATFORM:-linux/amd64}"

WEB_BUILD_ENV="${WEB_BUILD_ENV:-$REPO_ROOT/web/.env.production}"
if [[ -f "$WEB_BUILD_ENV" ]]; then
  # shellcheck disable=SC1090
  source "$WEB_BUILD_ENV"
fi

: "${VITE_OIDC_ISSUER:?Set VITE_OIDC_ISSUER in the release environment}"
: "${VITE_OIDC_CLIENT_ID:?Set the registered production VITE_OIDC_CLIENT_ID in the release environment}"
: "${VITE_OIDC_AUDIENCE:?Set VITE_OIDC_AUDIENCE in the release environment}"

if [[ "$VITE_OIDC_ISSUER" != https://* ]]; then
  echo "Production VITE_OIDC_ISSUER must use HTTPS" >&2
  exit 1
fi

echo "==> Building ${REGISTRY}/ap-connect-api:${TAG}"
docker build \
  --platform "$BUILD_PLATFORM" \
  -f "$REPO_ROOT/infra/docker/Dockerfile.api" \
  -t "${REGISTRY}/ap-connect-api:${TAG}" \
  "$REPO_ROOT"

echo "==> Building ${REGISTRY}/ap-connect-web:${TAG}"
docker build \
  --platform "$BUILD_PLATFORM" \
  -f "$REPO_ROOT/infra/docker/Dockerfile.web" \
  --build-arg VITE_OIDC_ISSUER="${VITE_OIDC_ISSUER:-}" \
  --build-arg VITE_OIDC_CLIENT_ID="${VITE_OIDC_CLIENT_ID:-}" \
  --build-arg VITE_OIDC_AUDIENCE="${VITE_OIDC_AUDIENCE:-}" \
  --build-arg VITE_IMAGES_URL="${VITE_IMAGES_URL:-}" \
  --build-arg VITE_TENOR_API_KEY="${VITE_TENOR_API_KEY:-}" \
  --build-arg VITE_APP_ORIGIN="${VITE_APP_ORIGIN:-}" \
  -t "${REGISTRY}/ap-connect-web:${TAG}" \
  "$REPO_ROOT"

echo "==> Pushing (requires: docker login ghcr.io -u <user>)"
docker push "${REGISTRY}/ap-connect-api:${TAG}"
docker push "${REGISTRY}/ap-connect-web:${TAG}"
