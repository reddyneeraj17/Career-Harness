#!/usr/bin/env bash
# PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only:
# no redistribution, no sharing, no export. Do not edit — see CUSTOMER_RULES.md.
# upgrade.sh — upgrade an installed harness-kit from one version to another.
# Rollback = run this again with the older version.
#
# Usage:
#   ./install/upgrade.sh <target-version>     # e.g. ./install/upgrade.sh 1.1.0
#   ./install/upgrade.sh --check              # report current vs kit version
#
# Steps:
#   1. compare installed VERSION against target
#   2. run pending drizzle migrations in filename order (hook for the agent)
#   3. refresh skills/templates from the kit (idempotent copy)
#   4. recompile schedules from the customer's profile.yaml (hook)
#   5. run the doctor (hook)
#
# Steps 2/4/5 touch the live artifact and DB, so this script prints the exact
# agent actions instead of performing them itself.

set -euo pipefail

KIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KIT_VERSION="$(cat "$KIT_DIR/VERSION" 2>/dev/null || echo unknown)"

if [[ "${1:-}" == "--check" ]]; then
  echo "kit version:     $KIT_VERSION"
  if [[ -f "$HOME/workspace/harness-kit/VERSION.installed" ]]; then
    echo "installed version: $(cat "$HOME/workspace/harness-kit/VERSION.installed")"
  else
    echo "installed version: unknown (no VERSION.installed marker)"
  fi
  exit 0
fi

TARGET="${1:-}"
[[ -z "$TARGET" ]] && { echo "usage: $0 <target-version> | --check"; exit 2; }

INSTALLED="unknown"
[[ -f "$HOME/workspace/harness-kit/VERSION.installed" ]] && INSTALLED="$(cat "$HOME/workspace/harness-kit/VERSION.installed")"

echo "== harness-kit upgrade: $INSTALLED -> $TARGET (kit: $KIT_VERSION) =="

# 1. version sanity ----------------------------------------------------------
if [[ "$TARGET" == "$INSTALLED" ]]; then
  echo "already at $TARGET; nothing to do."
  exit 0
fi

# 2. refresh code from the kit (idempotent) ----------------------------------
echo "-- refreshing skills/templates from kit --"
# install.sh stages these read-only (CUSTOMER_RULES.md); unlock briefly to refresh
chmod -R u+w "$HOME/workspace/skills" "$HOME/workspace/templates" 2>/dev/null || true
cp -r "$KIT_DIR/skills/." "$HOME/workspace/skills/"
cp -r "$KIT_DIR/templates/." "$HOME/workspace/templates/"
chmod -R a-w "$HOME/workspace/skills" "$HOME/workspace/templates" 2>/dev/null || true
echo "  [ok] skills + templates refreshed (re-locked read-only)"

# 3. migrations (agent hook) --------------------------------------------------
echo "-- migrations (run by the agent, in order) --"
echo "  for each NEW file in $KIT_DIR/harness-core/drizzle/*.sql"
echo "  (filename order) that is not yet applied: apply it via the"
echo "  artifact's migration path, then verify with snapshot()."

# 4. recompile (agent hook) ----------------------------------------------------
echo "-- recompile (run by the agent) --"
echo "  run the compile-schedules skill against the customer's"
echo "  ~/workspace/profile.yaml (validated by profile.schema.yaml)."

# 5. doctor (agent hook) --------------------------------------------------------
echo "-- doctor (run by the agent) --"
echo "  run the harness-doctor skill; require status green before closing."

echo "$TARGET" > "$HOME/workspace/harness-kit/VERSION.installed"
echo "== upgrade marker written: $TARGET =="
echo "NOTE: steps 3-5 above must be executed by the agent before the upgrade"
echo "is considered complete. See PACKAGING.md."
