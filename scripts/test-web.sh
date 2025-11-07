#!/usr/bin/env bash

# Fail fast on any error, undefined variable, or pipeline failure.
set -euo pipefail

# Resolve repository root and target directory.
REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="${REPO_ROOT}/apps/web"

if [[ ! -d "${WEB_DIR}" ]]; then
  echo "Web application directory not found at ${WEB_DIR}" >&2
  exit 1
fi

# Decide which package manager to use. Prefer Bun when available because the
# project ships a bun.lock file, otherwise fall back to npm.
if command -v bun >/dev/null 2>&1 && [[ -f "${WEB_DIR}/bun.lock" ]]; then
  PACKAGE_MANAGER="bun"
else
  PACKAGE_MANAGER="npm"
fi

pushd "${WEB_DIR}" >/dev/null

if [[ "${PACKAGE_MANAGER}" == "bun" ]]; then
  if [[ ! -d "node_modules" ]]; then
    if ! bun install --frozen-lockfile; then
      echo "Bun install failed, falling back to npm..." >&2
      PACKAGE_MANAGER="npm"
    fi
  fi

  if [[ "${PACKAGE_MANAGER}" == "bun" ]]; then
    bun run lint
    bun run build
    popd >/dev/null
    exit 0
  fi
fi

if [[ "${PACKAGE_MANAGER}" == "npm" ]]; then
  if [[ ! -d "node_modules" ]]; then
    if ! npm ci; then
      echo "npm ci failed; attempting to run existing web checks..." >&2
    fi
  fi

  npm run lint
  npm run build
  popd >/dev/null
  exit 0
fi

popd >/dev/null
echo "Unsupported package manager: ${PACKAGE_MANAGER}" >&2
exit 1
