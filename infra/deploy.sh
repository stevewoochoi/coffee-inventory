#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=== Coffee Inventory Deploy ==="
echo "Project root: $PROJECT_ROOT"

# 1. 환경변수 체크
REQUIRED_VARS=("DB_URL" "DB_USERNAME" "DB_PASSWORD" "JWT_SECRET")
MISSING=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var:-}" ]; then
        MISSING+=("$var")
    fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
    echo "ERROR: Missing required environment variables:"
    for var in "${MISSING[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "Set them in .env file or export them before running this script."
    exit 1
fi

echo "[1/4] Environment variables OK"

# 2. Git pull (if in a git repo)
cd "$PROJECT_ROOT"
if [ -d .git ]; then
    echo "[2/4] Pulling latest code..."
    git pull --ff-only
else
    echo "[2/4] Not a git repo, skipping pull"
fi

# 3. Build and start containers
echo "[3/4] Building and starting containers..."
cd "$SCRIPT_DIR"
docker compose down --remove-orphans 2>/dev/null || true
docker compose build --no-cache
docker compose up -d

# 4. Health check
echo "[4/4] Waiting for health check..."
MAX_RETRIES=30
RETRY_INTERVAL=5
for i in $(seq 1 $MAX_RETRIES); do
    if curl -sf http://localhost/actuator/health > /dev/null 2>&1; then
        echo ""
        echo "=== Deploy SUCCESS ==="
        echo "Application is healthy at http://localhost"
        docker compose ps
        exit 0
    fi
    echo -n "."
    sleep $RETRY_INTERVAL
done

echo ""
echo "=== Deploy WARNING: Health check timeout ==="
echo "Containers are running but health check did not pass within $((MAX_RETRIES * RETRY_INTERVAL))s"
docker compose ps
docker compose logs --tail=20 backend
exit 1
