#!/usr/bin/env bash
# Manual build+push, run from a developer machine. No CI/CD wired up on purpose.
set -euo pipefail

TAG="${1:?Usage: build-and-push.sh <tag>}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REGISTRY="ghcr.io/ap-education"
# The default DigitalOcean droplet runs x86_64, including when built on an ARM Mac.
BUILD_PLATFORM="${DOCKER_BUILD_PLATFORM:-linux/amd64}"

# The shell ships with Chats: this ap-app commit is the one each Chats release is built and tested with.
AP_APP_REF="${AP_APP_REF:-a97a917096898e07b6ff2e075f32ba8d5b9c155e}"
VITE_MFE_AI_URL="${VITE_MFE_AI_URL:-https://ai.ap-platform.online/embedded}"

WEB_BUILD_ENV="${WEB_BUILD_ENV:-$REPO_ROOT/web/.env.production}"
if [[ -f "$WEB_BUILD_ENV" ]]; then
  # shellcheck disable=SC1090
  source "$WEB_BUILD_ENV"
fi

: "${VITE_OIDC_ISSUER:?Set VITE_OIDC_ISSUER in the release environment}"
: "${VITE_OIDC_CLIENT_ID:?Set the registered production VITE_OIDC_CLIENT_ID in the release environment}"
: "${VITE_OIDC_AUDIENCE:?Set VITE_OIDC_AUDIENCE in the release environment}"
: "${VITE_APP_ORIGIN:?Set VITE_APP_ORIGIN, the public origin the shell is served from}"

if [[ "$VITE_OIDC_ISSUER" != https://* ]]; then
  echo "Production VITE_OIDC_ISSUER must use HTTPS" >&2
  exit 1
fi

# The shell knows its applications only from this list; one missing here is absent from the rail.
CHATS_URL="${VITE_APP_ORIGIN%/}/remotes/chats"
VITE_APPS='[{"id":"chats","label":"Чати","icon":"ChatsIcon","basePath":"/c","rail":"contributed","url":"'"$CHATS_URL"'"},{"id":"ai","label":"AI","icon":"HouseIcon","basePath":"/","rail":"tile","url":"'"$VITE_MFE_AI_URL"'"}]'

# Both the private ap-app repository and GitHub Packages accept the gh CLI token.
GITHUB_TOKEN="${GITHUB_TOKEN:-$(gh auth token)}"
export GITHUB_TOKEN

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT
mkdir -p "$WORK_DIR/previous"

echo "==> Building the AP shell from ap-app@${AP_APP_REF}"
docker build \
  -f host/Dockerfile \
  --secret id=GIT_AUTH_TOKEN,env=GITHUB_TOKEN \
  --build-arg VITE_OIDC_ISSUER="$VITE_OIDC_ISSUER" \
  --build-arg VITE_OIDC_CLIENT_ID="$VITE_OIDC_CLIENT_ID" \
  --build-arg VITE_OIDC_AUDIENCE="$VITE_OIDC_AUDIENCE" \
  --build-arg VITE_IMAGES_URL="${VITE_IMAGES_URL:-}" \
  --build-arg VITE_APPS="$VITE_APPS" \
  --output "type=local,dest=$WORK_DIR/host" \
  "https://github.com/AP-Education/ap-app.git#${AP_APP_REF}"

# A shell that can't find Chats serves "no applications" to everyone, so it never ships.
if ! grep -q "$CHATS_URL/remoteEntry.js" "$WORK_DIR/host/srv/host/index.html"; then
  echo "The shell from ap-app@${AP_APP_REF} does not load Chats from ${CHATS_URL}" >&2
  exit 1
fi

# The live release's own assets, so pages opened before this deploy keep loading their chunks.
if [[ -n "${PREVIOUS_TAG:-}" ]]; then
  echo "==> Carrying assets from ${REGISTRY}/ap-connect-web:${PREVIOUS_TAG}"
  container="$(docker create --platform "$BUILD_PLATFORM" "${REGISTRY}/ap-connect-web:${PREVIOUS_TAG}")"
  if docker cp "$container:/srv/.release-assets" "$WORK_DIR/release-assets" 2>/dev/null; then
    docker export "$container" |
      tar -x -C "$WORK_DIR/previous" --strip-components=1 -T <(sed 's|^|srv/|' "$WORK_DIR/release-assets")
  fi
  docker rm "$container" >/dev/null
fi

echo "==> Building ${REGISTRY}/ap-connect-api:${TAG}"
docker build \
  --platform "$BUILD_PLATFORM" \
  -f "$REPO_ROOT/infra/docker/Dockerfile.api" \
  --secret id=npm_token,env=GITHUB_TOKEN \
  -t "${REGISTRY}/ap-connect-api:${TAG}" \
  "$REPO_ROOT"

echo "==> Building ${REGISTRY}/ap-connect-web:${TAG}"
docker build \
  --platform "$BUILD_PLATFORM" \
  -f "$REPO_ROOT/infra/docker/Dockerfile.web" \
  --build-context host="$WORK_DIR/host/srv/host" \
  --build-context previous="$WORK_DIR/previous" \
  --secret id=npm_token,env=GITHUB_TOKEN \
  --build-arg VITE_IMAGES_URL="${VITE_IMAGES_URL:-}" \
  --build-arg VITE_TENOR_API_KEY="${VITE_TENOR_API_KEY:-}" \
  -t "${REGISTRY}/ap-connect-web:${TAG}" \
  "$REPO_ROOT"

echo "==> Pushing (requires: docker login ghcr.io -u <user>)"
docker push "${REGISTRY}/ap-connect-api:${TAG}"
docker push "${REGISTRY}/ap-connect-web:${TAG}"
