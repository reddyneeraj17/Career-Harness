#!/usr/bin/env bash
# PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only:
# no redistribution, no sharing, no export. Do not edit — see CUSTOMER_RULES.md.
# release.sh — cut a versioned release of the harness kit.
#
# Does the mechanical work: version bump, doc branch-tag bumps, manifest
# rebuild, integrity check, commit, annotated tag. It NEVER pushes —
# pushing needs a single-use PAT and stays a human step (see RELEASING.md).
#
# Usage:
#   ./install/release.sh 1.3.0
#
# Before running: add a `## [1.3.0]` section to CHANGELOG.md and rebuild the
# blueprint PDF if the design changed.

set -euo pipefail
KIT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$KIT_DIR"

[[ $# -eq 1 ]] || { echo "Usage: $0 <version>   e.g. $0 1.3.0"; exit 1; }
NEW_VER="$1"
[[ "$NEW_VER" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "Version must be X.Y.Z (e.g. 1.3.0)"; exit 1; }
TAG="v$NEW_VER"

# 1. Clean tree — never cut a release on top of uncommitted work.
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is dirty — commit or stash first."
  exit 1
fi

# 2. Never reuse a tag.
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Tag $TAG already exists — tags are never reused or moved."
  exit 1
fi

# 3. Changelog entry must exist first.
if ! grep -q "^## \[$NEW_VER\]" CHANGELOG.md; then
  echo "CHANGELOG.md needs a '## [$NEW_VER]' section before releasing."
  exit 1
fi

OLD_VER="$(cat VERSION)"
echo "Cutting $TAG (was $OLD_VER)..."

# 4. Bump VERSION and the --branch pins in the install docs.
echo "$NEW_VER" > VERSION
for f in docs/SETUP_PROMPT.md PACKAGING.md; do
  [[ -f "$f" ]] && sed -i "s/--branch v$OLD_VER/--branch v$NEW_VER/g" "$f"
done
[[ -f PACKAGING.md ]] && sed -i \
  -e "s/harness-kit-$OLD_VER\.tar\.gz/harness-kit-$NEW_VER.tar.gz/g" \
  -e "s|./install/upgrade.sh v$OLD_VER|./install/upgrade.sh v$NEW_VER|" \
  PACKAGING.md

# 5. Rebuild the manifest and prove the kit is intact.
git ls-files -z | grep -zv '^install/MANIFEST\.sha256$' | xargs -0 sha256sum > install/MANIFEST.sha256
./install/install.sh --check || {
  echo "Integrity check failed — fix it before releasing."
  exit 1
}

# 6. Commit and tag (annotated). Pushing is a separate human step.
git add -A
git -c user.name="Muse" -c user.email="muse@local" commit -m "Release v$NEW_VER" --quiet
git -c user.name="Muse" -c user.email="muse@local" tag -a "$TAG" -m "Career Harness $TAG"
echo "Done: tagged $TAG at $(git rev-parse --short HEAD). NOT pushed."
echo
echo "To publish (see RELEASING.md — needs a fresh single-use PAT):"
echo "  URL=\"https://x-access-token:\$TOKEN@github.com/reddyneeraj17/Career-Harness.git\""
echo "  git ls-remote \"\$URL\" refs/heads/main   # real remote state FIRST"
echo "  git push \"\$URL\" main && git push \"\$URL\" $TAG"
echo "  unset TOKEN URL   # then revoke the PAT in GitHub settings"
