# Release v1.2.6 — 2026-09-27

Feature release: skill upgrades, the LinkedIn optimizer, full reference
seeds in the kit, and an interactive run live view.

## Added

- **Five skill upgrades** (additive techniques only — no invented data,
  no autonomous outreach):
  - `fit-judge` 1.3.0: must-have vs nice-to-have classification,
    keyword-frequency evidence, fit bands, posting red-flag detection
    (surfaced, never auto-reject).
  - `resume-tailor` 1.4.0: ATS keyword-placement priority, exact JD
    phrasing preference, technical bullet formula, metrics taxonomy,
    ATS-safe formatting, keyword-change evidence.
  - `screening-answerer` 1.3.0: composition rules for derived answers
    only, length calibration, anti-padding rules. Verbatim profile
    answers untouched; unknowns still hold.
  - `vendor-prep` 1.1.0: grounded STAR stories (full / 60-second /
    one-line), questions by interviewer audience, before/after metrics
    tables, honest gap framing, salary deflection without inventing a
    number, permission-first reference briefings.
  - `cover-letter-writer` 1.1.0: five opening hooks, need + experience
    + result body formula, honest gap framing, two alternate openings,
    ten-point quality check, human-triggered-only cold-outreach mode.
- **LinkedIn optimizer** (new `linkedin-optimizer` skill 1.0.0 + an
  "Optimize LinkedIn" dashboard button): three gated phases — audit
  (read-only, scores the live profile), propose (per-section rewrites),
  apply (edits only approved sections, each verified by re-read). The
  identity gate runs first every phase. Approvals render per section
  with side-by-side current/proposed text and Approve / Edit / Discard.
  New actions `linkedin_optimize_start`, `linkedin_optimize_proposal_complete`,
  `linkedin_optimize_apply_complete`; migrations 0012 (per-section
  approval fields) and 0013 (run mode).
- **Full reference seeds ship in the kit** (`seed/`): 86,230 companies,
  82,697 H-1B sponsors (all rows verified yes/no), 1,010 prime vendors.
  A customer install imports all three into the database via the
  dashboard import actions (idempotent upserts). The seed README
  documents the refresh process and restates the standing rules:
  `unknown` H-1B rows are never imported; vendor H-1B notes are never
  sponsorship evidence.
- **Interactive run live view**: the run detail panel now shows a
  "Suggested next steps" strip derived from run state (blocker → retry
  hint, open approvals → review jump, failures → event log) plus an
  "Ask about this run" composer that copies a context-rich prompt for
  pasting into main chat.

## Upgrade notes

- Three migrations ship in this release (0009 was 1.2.5; 0012 and 0013
  are new here — 0010/0011 also ride along for anyone upgrading from
  1.2.4). Follow `docs/UPGRADE_PLAYBOOK.md` (fetch → refresh →
  migrations → rebuild dashboard → recompile → doctor green).
- The LinkedIn optimizer's apply phase needs a live browser session on
  the customer's own LinkedIn account; audit/propose are read-only until
  per-section approval.

## Notes

- Blueprint PDF rebuilt to v2.12 (§13.13 "Conversational live view",
  LinkedIn optimizer phases, per-section approvals, migrations
  0012–0013).
