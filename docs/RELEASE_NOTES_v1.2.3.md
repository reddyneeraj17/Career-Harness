# Release v1.2.3 — 2026-09-26

Patch release fixing a broken fresh install: the Excel onboarding step had no converter to run.

## Fixed

- **Onboarding converter now ships in the kit.** The `client-onboarding`
  skill runs `python3 ~/workspace/client-onboarding-form/excel_to_persona_yaml.py`,
  but the script was never committed to the kit and `install.sh` never
  staged it — every fresh install stalled at the Excel onboarding step
  with no converter to run. The script now lives at
  `client-onboarding-form/excel_to_persona_yaml.py` in the kit;
  `install.sh` verifies it in `--check`, stages it to
  `~/workspace/client-onboarding-form/`, and includes it in the read-only
  lockdown. A customer mid-install on 1.2.x can drop the single
  maintainer-provided file at that path and continue without reinstalling.

## Notes

- The repository is public as of this release, so fresh clones no longer
  need a token: `git clone --branch v1.2.3 https://github.com/reddyneeraj17/Career-Harness.git`.
  The one-time-token flow remains documented for private mirrors.
- No design changes in this release (no schema, action, skill, tab, or
  rule changes) — the blueprint PDF is unaffected.
