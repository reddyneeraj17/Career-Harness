# Release notes — Career Harness v1.3.3

**A new interview-prep skill, settled onboarding defaults, and a full
factual scrub of the install/upgrade docs.**

## What changed

- **New `interview-prep-pack` skill.** One command builds the 10-page A4
  Interview Prep Pack PDF in the house style (dark cover, red rule,
  sections 01–07, answer and story banks, day-of checklist, verbatim JD
  appendix). It gathers the invite, the JD (saved verbatim from the
  application run, or the live posting), the application record, and
  confirmed candidate facts — from the run folder, LinkedIn, or email —
  renders and validates the PDF, and hands it over in chat. Ships with
  `assets/template.html` + `assets/prep-pack.css`.
- **Onboarding defaults settled.** `skip_no_sponsorship_postings` is
  always Yes. Essay questions are decided with the client on the setup
  call (auto-send vs draft-for-approval); ambiguous prompts derive from
  the resume — infer and write, don't hold. `max_travel` defaults to 50%
  when the client gives nothing. `max_per_run` raised 10 → 50.
- **Shadow week removed.** No more mandated review-only first week — the
  harness runs per the customer's configured automation settings from day
  one; the dry-run smoke test remains the pre-submit proof.
- **Docs factual scrub.** Version pins, skill counts, migration counts,
  and install-step descriptions corrected across SETUP_PROMPT,
  OPERATOR, INSTALL_LAYOUT, UPGRADE_PLAYBOOK, and RELEASING; fresh
  installs now stamp `VERSION.installed`.
- **Onboarding playbook is the procedure.** The client-onboarding skill's
  inline step list is now a single pointer to the canonical playbook, and
  the playbook gained the mandatory `profile_save`/`profile_put` handoff
  so the Profile tab is never left empty.

## Upgrade notes

No migrations, no seed changes, no dashboard changes in this release.
On a running tenant, `upgrade.sh 1.3.3` refreshes skills and templates,
then the doctor confirms green. New defaults apply to new onboardings
only — existing tenant profiles are untouched.
