#!/usr/bin/env bash
# Local mirror of CI without E2E, stopping at the first failure:
#   ruff -> compileall -> pytest -> frontend lint -> tsc -> npm test (node --test) -> build
# Needs TEST_DB_URL (local kpopit_test, see kpopit-backend/tests/README.md) and, for the build's
# prerender, a local backend at PRERENDER_API_URL (default http://127.0.0.1:5000). macOS/Linux/Git Bash.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/kpopit-backend"
FRONTEND="$ROOT/kpopit-frontend"

if [ -x "$BACKEND/.venv/bin/python" ]; then
  PY="$BACKEND/.venv/bin/python"
elif [ -x "$BACKEND/.venv/Scripts/python.exe" ]; then
  PY="$BACKEND/.venv/Scripts/python.exe"
else
  echo "check: no kpopit-backend/.venv found (create it and pip install -r requirements.txt)" >&2
  exit 1
fi

# Test runs never load kpopit-backend/.env (see kpopit-backend/utils/env.py).
export PYTHON_DOTENV_DISABLED=1 FLASK_SKIP_DOTENV=1

step() { printf '\n==> %s\n' "$1"; }

if [ -z "${TEST_DB_URL:-}" ]; then
  echo "check: set TEST_DB_URL to the local kpopit_test database before running" >&2
  exit 1
fi

PRERENDER_API_URL="${PRERENDER_API_URL:-http://127.0.0.1:5000}"
if ! curl -sf "$PRERENDER_API_URL/api/idols-page" > /dev/null; then
  echo "check: the build prerenders from $PRERENDER_API_URL; start a local test backend first" >&2
  exit 1
fi

step "ruff"
(cd "$BACKEND" && "$PY" -m ruff check .)

step "compileall"
(cd "$BACKEND" && "$PY" -m compileall -q . > /dev/null)

step "pytest"
(cd "$BACKEND" && "$PY" -m pytest -q)

step "frontend lint"
(cd "$FRONTEND" && npm run lint)

step "tsc"
(cd "$FRONTEND" && npx tsc -b)

step "npm test (node --test)"
(cd "$FRONTEND" && npm test)

step "build"
(cd "$FRONTEND" && npm run build)

printf '\ncheck: all steps passed\n'
