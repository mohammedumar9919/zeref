#!/usr/bin/env bash
set -euo pipefail

PHASE="${1:-}"
if [[ -z "$PHASE" ]] || ! [[ "$PHASE" =~ ^[0-5]$ ]]; then
  echo "Usage: $0 <phase 0-5>" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export DATABASE_URL="${DATABASE_URL:-postgres://zeref:zeref@localhost:5432/zeref}"
export ZEREF_LLM_MOCK="${ZEREF_LLM_MOCK:-1}"
if [[ "$PHASE" -ge 5 ]]; then
  export ZEREF_BFF_FIXTURE="${ZEREF_BFF_FIXTURE:-1}"
fi

echo "=== build ==="
npm run build

echo "=== lint ==="
npm run lint

for ((i = 0; i <= PHASE; i++)); do
  echo "=== verify:phase-$i ==="
  npm run "verify:phase-$i"
done

echo "Phase gate $PHASE OK"
