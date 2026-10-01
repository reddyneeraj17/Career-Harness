# Release notes — Career Harness v1.3.2

**Customer onboarding goes nearly touchless, portals get a question bank
with safe defaults, mid-application challenges get a solver, and resumes
learn to tell real stories.**

## What changed

- **Client onboarding: 99% prefilled.** New `docs/PERSONA_DEFAULTS.md`
  defines the default rules for every persona field — 7 must-ask items in
  a ~15-minute setup call, everything else prefilled from safe defaults
  and resume extraction (broad search defaults, 24 pre-filled screening
  answers, resume-extracted years matrix). The Excel converter normalizes
  employment-type labels to lane slugs and extracts company targeting
  (tier preference, industries to avoid, never-apply list, dream
  companies), `preferred_lane`, and `hold_policy`. eligibility-judge
  rejects never-apply companies; run-coordinator prioritizes dream
  companies within their tier.
- **Portal question bank.** New `docs/PORTAL_QUESTION_BANK.md`: ~70
  canonical application questions, each with a default answer, answer
  source, and risk tier (LOW auto-fill / MEDIUM fill+log / HIGH hold /
  NEVER hold+alert). screening-answerer 1.4.0 consults it before holding;
  portal-navigator 1.6.0 fills from it — and 1.4.1 adds a
  cross-question consistency guard so answers on one application can't
  contradict each other or the persona.
- **New `challenge-solver` skill (1.0.0).** Handles mid-application portal
  challenges inside the live browser session: checkbox CAPTCHAs clicked
  once, image-select one vision attempt then park, email OTPs read from
  the authorized mailbox and entered transiently (one resend), email
  verification links opened in the same session. Text CAPTCHAs, bot-walls,
  and SMS park with evidence — never bypassed, never third-party solving
  services, OTP codes never persisted.
- **Submission quality gates (portal-navigator 1.7.0).** Posting-live
  check before intent, ATS-readable PDF requirement (resume must have a
  text layer), pre-submit persona-consistency check, numeric salary `0`
  only as a forced-field last resort, and 60-second minimum pacing
  between submits on the same portal domain.
- **Resume story-crafting (resume-tailor 1.5.0).** Every bullet is now
  built as industry → problem → tools → story from real variant facts,
  with per-bullet `story_provenance` in the evidence. Company-stack
  injection from company-read sources: documented patterns may frame real
  work, equivalent tools are named honestly and never renamed.
  Domain-based experience selection, recruiter scan structure, two-page
  substance target — thin histories emit `resume_gaps` for the customer
  instead of padding. resume-reviewer 1.5.0 adds the matching
  story-provenance check: unsourced story elements are rejected, however
  plausible they read.
- **fit-judge default threshold 60 → 25 (1.4.1).** Per operator tuning.

## Upgrade notes

- No new migrations. Upgrading customers keep their database; the
  dashboard rebuilds from the new client on upgrade as usual
  (`docs/UPGRADE_PLAYBOOK.md`).
- The new onboarding defaults and question bank take effect for personas
  created after this upgrade; existing personas are untouched.
