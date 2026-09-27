# PACKAGING.md — how the harness kit ships

> **PROPRIETARY — Career Harness © 2026 Neeraj Reddy.** Licensed customers only: no redistribution, no sharing, no export. Core files are read-only (see CUSTOMER_RULES.md). Full terms in LICENSE.


## What this repo is

`harness-kit` is the single shippable artifact of the Job-Apply Harness.
One repo, versioned with semver (`VERSION` file, git tags `vX.Y.Z`).
The maintainer edits here; customers receive it only through the channels
in DISTRIBUTION.md (managed service, or supervised self-host install from
the private repo with a one-time deploy key). Customers never pull from
this repo on their own.

## Layout

```
harness-kit/
├── VERSION                  # semver, e.g. 1.0.0
├── CHANGELOG.md             # keep-a-changelog entries per release
├── README.md / INSTALL.md   # what it is / agent runbook
├── PACKAGING.md             # this file
├── .gitignore               # customer-data guardrails
├── skills/                  # 28 skills; the ONLY place logic lives
├── templates/               # *.body.md cron templates + profile.schema.yaml
├── harness-core/            # dashboard artifact source (client/, server/, drizzle/)
├── seed/                    # h1b_employer_hub.csv, companies_seed.csv
├── client-onboarding-form/  # excel_to_persona_yaml.py (staged to ~/workspace/client-onboarding-form/ by install.sh)
├── goal-skeletons/          # empty per-campaign goal dirs
├── profile.example.yaml     # redacted template; never real data
├── docs/                    # architecture blueprint PDF (the spec)
└── install/
    ├── install.sh           # fresh install (+ --check dry-run)
    └── upgrade.sh           # version-to-version upgrade
```

## What never ships

Enforced by `.gitignore`; the installer also refuses to pack them:

- `profile.yaml` (real one), `user/` (resumes, files), `hidden_files/`
- `*.db` (SQLite stores), credentials, manifests, `node_modules/`, `dist/`

`profile.example.yaml` ships with every PII field replaced by
`REPLACE_ME` placeholders. The compatibility contract between releases is
`templates/profile.schema.yaml` — a release declares the schema version it
needs, and the doctor reports drift.

## Release process (maintainer)

1. Make changes on a branch; update `CHANGELOG.md`.
2. Bump `VERSION`, rebuild the blueprint PDF into `docs/`.
3. Run the kit self-check: `./install/install.sh --check` on a clean copy.
4. Tag `vX.Y.Z` (signed tag), push.
5. CI builds `harness-kit-X.Y.Z.tar.gz` + `.sha256`, attaches both to the
   release. Data-only releases (H-1B hub refresh) are tagged
   `data-YYYYMMDD` and ship just `seed/`.

## Install (customer's Muse)

Path A — git works in the customer's VM:

```sh
git clone --branch v1.2.6 <repo-with-one-time-deploy-key> ~/workspace/harness-kit  # private repo; key revoked after install
cd ~/workspace/harness-kit && ./install/install.sh
```

Tags are the version pin: `--branch` accepts a tag, so this checks out
exactly v1.2.0. A GitHub Release is also published on each tag for
visibility (see RELEASING.md). Bump the `--branch` tag (e.g. `v1.3.0`)
when you cut a new version.

Path B — no network: upload the release tarball, then

```sh
tar xzf harness-kit-1.2.6.tar.gz -C ~/workspace/
cd ~/workspace/harness-kit && ./install/install.sh
```

`install.sh` stages `skills/`, `templates/`, `seed/`, `goal-skeletons/`,
verifies checksums, and prints the agent runbook: build the harness-core
artifact from `harness-core/` source, run drizzle migrations in order,
import seeds, copy `profile.example.yaml` → `~/workspace/profile.yaml`,
complete Excel-first onboarding (or the dashboard setup wizard), connect accounts, run compile-schedules, smoke-test, doctor.

## Upgrade / rollback

```sh
cd ~/workspace/harness-kit && ./install/upgrade.sh v1.2.6
```

`upgrade.sh` checks the current `VERSION` against the target, runs pending
drizzle migrations in filename order, recompiles schedules from the
customer's `profile.yaml`, and runs the doctor. Rollback is the same
command with the older version — migrations are ordered and customer data
never re-enters the repo, so downgrading is safe.

## Support boundary

The customer owns exactly one file: `profile.yaml`. Everything else derives
from it. Support = "send me your doctor output + (redacted) profile.yaml".
