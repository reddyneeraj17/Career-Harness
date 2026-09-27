#!/usr/bin/env bash
# PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only:
# no redistribution, no sharing, no export. Do not edit — see CUSTOMER_RULES.md.
# install.sh — fresh install of the Job-Apply Harness kit into a customer's
# Muse environment. Idempotent: safe to re-run.
#
# Usage:
#   ./install/install.sh            # full install (staging step)
#   ./install/install.sh --check    # dry-run: verify kit integrity only
#
# What this script does (staging):
#   1. prereq checks (bash, python3; git optional)
#   2. verifies kit integrity (VERSION + required dirs/files present)
#   3. verifies sha256 checksums against install/MANIFEST.sha256 when present
#   4. copies skills/, templates/, seed/, goal-skeletons/, client-onboarding-form/ into place
#   5. prints the agent runbook (artifact build, migrations, intake, compile)
#
# What it does NOT do (the agent does these, see INSTALL.md):
#   - build the harness-core artifact (artifact.create_web_fullstack)
#   - run drizzle migrations, import seeds, run intake / compile-schedules

set -euo pipefail

KIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(cat "$KIT_DIR/VERSION" 2>/dev/null || echo unknown)"
CHECK_MODE=0
[[ "${1:-}" == "--check" ]] && CHECK_MODE=1

pass() { echo "  [ok] $1"; }
fail() { echo "  [FAIL] $1"; FAILURES=$((FAILURES+1)); }
FAILURES=0

echo "== harness-kit install (v$VERSION) =="
echo "kit dir: $KIT_DIR"
[[ $CHECK_MODE -eq 1 ]] && echo "mode: --check (dry run, no changes)"

# 1. prereqs ---------------------------------------------------------------
echo "-- prereqs --"
command -v bash >/dev/null && pass "bash" || fail "bash missing"
command -v python3 >/dev/null && pass "python3 $(python3 --version 2>&1 | cut -d' ' -f2)" || fail "python3 missing"
if command -v git >/dev/null; then pass "git $(git --version | cut -d' ' -f3)"; else echo "  [..] git not found (optional; tarball path still works)"; fi
if command -v sha256sum >/dev/null; then pass "sha256sum"; else echo "  [..] sha256sum missing (checksum verify skipped)"; fi

# 2. kit integrity ---------------------------------------------------------
echo "-- kit integrity --"
for d in skills templates seed goal-skeletons harness-core install docs client-onboarding-form; do
  [[ -d "$KIT_DIR/$d" ]] && pass "dir $d/" || fail "dir $d/ missing"
done
for f in VERSION CHANGELOG.md PACKAGING.md CUSTOMER_RULES.md INSTALL.md profile.example.yaml .gitignore; do
  [[ -f "$KIT_DIR/$f" ]] && pass "file $f" || fail "file $f missing"
done
[[ -f "$KIT_DIR/docs/OPERATOR.md" ]] && pass "file docs/OPERATOR.md" || fail "docs/OPERATOR.md missing"
n_skills=$(find "$KIT_DIR/skills" -maxdepth 2 -name SKILL.md | wc -l)
[[ "$n_skills" -ge 26 ]] && pass "$n_skills skills with SKILL.md" || fail "only $n_skills skills with SKILL.md (want >= 26)"
[[ -f "$KIT_DIR/templates/profile.schema.yaml" ]] && pass "templates/profile.schema.yaml" || fail "profile.schema.yaml missing"
[[ -f "$KIT_DIR/client-onboarding-form/excel_to_persona_yaml.py" ]] && pass "client-onboarding-form/excel_to_persona_yaml.py" || fail "onboarding converter missing"
[[ -f "$KIT_DIR/harness-core/space.json" ]] && pass "harness-core/space.json" || fail "harness-core/space.json missing"
[[ -f "$KIT_DIR/harness-core/package.json" ]] && pass "harness-core/package.json" || fail "harness-core/package.json missing"
[[ -d "$KIT_DIR/harness-core/client/src" ]] && pass "harness-core/client/src" || fail "harness-core client/src missing"
[[ -d "$KIT_DIR/harness-core/server/src" ]] && pass "harness-core/server/src" || fail "harness-core server/src missing"
[[ -f "$KIT_DIR/harness-core/drizzle/0001_initial.sql" ]] && pass "harness-core/drizzle/ migrations" || fail "drizzle migrations missing"
[[ -f "$KIT_DIR/seed/h1b_employer_hub.csv" ]] && pass "seed/h1b_employer_hub.csv" || fail "H-1B seed missing"
[[ -f "$KIT_DIR/seed/companies_seed.csv" ]] && pass "seed/companies_seed.csv" || fail "companies seed missing"
[[ -f "$KIT_DIR/seed/prime_vendors.csv" ]] && pass "seed/prime_vendors.csv" || fail "prime vendors seed missing"

# 3. checksum manifest ------------------------------------------------------
echo "-- checksums --"
if [[ -f "$KIT_DIR/install/MANIFEST.sha256" ]] && command -v sha256sum >/dev/null; then
  (cd "$KIT_DIR" && sha256sum -c install/MANIFEST.sha256 --quiet) \
    && pass "MANIFEST.sha256 verified" \
    || fail "checksum mismatch — do not install this copy"
else
  echo "  [..] no MANIFEST.sha256 (dev copy); skipping verify"
fi

# 4. customer-data guardrail: refuse to stage if the kit somehow contains PII.
# NOTE: install.sh itself is excluded — it carries the denylist patterns.
echo "-- customer-data guardrail --"
if grep -rIl --exclude-dir=node_modules --exclude="install.sh" -e "neerajreddyr@outlook.com" -e "6099484074" -e "609-948-4074" -e "linkedin.com/in/neeraj-reddyr" "$KIT_DIR" 2>/dev/null | grep -q .; then
  fail "kit contains customer PII — refusing to stage"
else
  pass "no customer PII detected"
fi

if [[ $CHECK_MODE -eq 1 ]]; then
  echo "== --check done: $FAILURES failure(s) =="
  exit $((FAILURES > 0 ? 1 : 0))
fi

# 5. staging -----------------------------------------------------------------
echo "-- staging --"
WS="${HOME}/workspace"
mkdir -p "$WS/skills" "$WS/user/files"
cp -r "$KIT_DIR/skills/." "$WS/skills/"
pass "skills -> $WS/skills/"
mkdir -p "$WS/templates"
cp -r "$KIT_DIR/templates/." "$WS/templates/"
pass "templates -> $WS/templates/"
mkdir -p "$WS/goals"
for g in "$KIT_DIR"/goal-skeletons/*/; do
  name="$(basename "$g")"
  if [[ ! -d "$WS/goals/$name" ]]; then
    cp -r "$g" "$WS/goals/$name"
    mkdir -p "$WS/goals/$name"/{crons,files,hidden_files,briefs,agent_notes,references}
  fi
done
pass "goal skeletons staged (+ crons/files/hidden_files/briefs/agent_notes/references)"
# profile bootstrap: example -> live profile only if the customer has none
if [[ ! -f "$WS/profile.yaml" ]]; then
  cp "$KIT_DIR/profile.example.yaml" "$WS/profile.yaml"
  pass "profile.example.yaml -> $WS/profile.yaml (fill in via intake)"
else
  echo "  [..] $WS/profile.yaml exists; not overwritten"
fi
mkdir -p "$WS/client-onboarding-form"
cp "$KIT_DIR/client-onboarding-form/excel_to_persona_yaml.py" "$WS/client-onboarding-form/"
pass "onboarding converter -> $WS/client-onboarding-form/ (client-onboarding skill)"
mkdir -p "$WS/user/files"
pass "user/files ready (customer drops their resume PDF here)"

# 6. lockdown (CUSTOMER_RULES.md enforcement) ----------------------------------
echo "-- lockdown (kit code is read-only in customer environments) --"
chmod -R a-w "$WS/skills" "$WS/templates" "$WS/client-onboarding-form" 2>/dev/null && pass "staged skills/templates/converter set read-only" || echo "  [..] chmod skipped (non-POSIX fs?)"
echo "  rule: the customer's Muse never edits kit code; see $KIT_DIR/CUSTOMER_RULES.md"

echo ""
echo "== staging complete. Agent runbook (see INSTALL.md): =="
echo " 1. Build the harness-core artifact (web_fullstack) from $KIT_DIR/harness-core/"
echo " 2. Run drizzle migrations in filename order (harness-core/drizzle/0001..0005+)"
echo " 3. Import seeds: h1b_import <- seed/h1b_employer_hub.csv, companies_import <- seed/companies_seed.csv, prime_vendors_import <- seed/prime_vendors.csv"
echo " 4. ONBOARDING EXCEL: customer fills templates/Client_Onboarding_Form_v2.xlsx"
echo "    (12 sheets: About You, Work Authorization, Resumes, Experience Matrix,"
echo "    Target Roles, Preferences, Screening Answers, Accounts & Connections,"
echo "    Automation Settings, Sign-off) + attaches resume PDFs; drops the filled"
echo "    form in ~/workspace/profiles/inbox/; run the client-onboarding skill ->"
echo "    profiles/<client_id>.yaml (validated) + resume variants registered"
echo " 5. CONNECT ACCOUNTS: run the account-connector skill with the customer in the"
echo "    Muse client (secure login cards render in chat, never in this terminal)."
echo "    LinkedIn, Dice, Indeed, ZipRecruiter, Glassdoor + Outlook/Gmail connector."
echo "    Credentials go ONLY in the customer's Secure Vault — never in files."
echo " 7. Run compile-schedules, then the smoke test, then the doctor"
