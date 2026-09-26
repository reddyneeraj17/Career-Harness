<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

---
name: portal-navigator
version: "1.3.0"
description: Drives one job application through an ATS portal with intent-before-submit, upload hash verification, and screenshot evidence.
---

# portal-navigator

> Changelog 1.3.0: optional reviewer-approved cover letter inputs; a mandatory cover-letter field attaches the approved letter (hash-verified) instead of parking — only an absent letter still routes to `approval_enqueue`.
> Changelog 1.2.0: canonical evidence paths (`goals/<campaign>/hidden_files/<run_id>/screenshots/<app_id>_<step>.png` + `<app_id>_confirmation.txt`); submitted transition now requires `{confirmation, screenshot_path, resume_path, resume_hash}`; honest null screenshot when capture fails.
> Changelog 1.1.0: execution-context header note (browser driving is coordinator-level; worker subagents do store-only steps and return a browser brief); `url` must be copied verbatim from the ledger row via `snapshot` with a re-read before step 1.

> **Execution context:** the browser-driving steps below run at coordinator level (the coordinator spawns this as a browser task). A generic worker subagent must NOT attempt browser driving; it performs only the `app_transition` / `approval_enqueue` / `companies_update` / `event_log` steps and returns the browser brief to the coordinator.

## Inputs

```json
{
  "app_id": "app-9f2c…",
  "url": "https://…",  // copied verbatim from the ledger row via snapshot; never from a summary. Re-read the row before step 1; mismatch → stop and report.
  "ats_type": "workday|greenhouse|lever|ashby|icims|easy-apply|generic",
  "pdf_path": "goals/<campaign>/hidden_files/<run>/resumes/<company>-<role>.pdf",
  "resume_hash": "<sha256(PDF bytes)[:12]>",
  "cover_letter_path": "<optional: goals/<campaign>/hidden_files/<run>/letters/<app_id>_cover_letter.txt>",
  "cover_letter_hash": "<optional: sha256(letter bytes)[:12] — reviewer-approved>",
  "run_id": "run-2026-09-26-1420"
}
```

Open the portal only after protocol step 1 succeeds. Follow `playbooks/<ats_type>.md` for portal-specific behavior.

## Actions called

- `app_transition` — the state machine. Every stage change goes through it.
- `companies_update` — report newly discovered ATS quirks (ats_type correction, park_count increment).
- `approval_enqueue` — unknown mandatory questions, never guessed.
- `event_log` — one row on exit with the verdict and token count.

## Evidence capture (canonical paths — no exceptions)

All submission evidence lives under the run's hidden files:

- Screenshots: `goals/<campaign>/hidden_files/<run_id>/screenshots/<app_id>_<step>.png`
  where `<step>` is `confirmation` for the final confirmation page, or `p1_before`, `p1_after`, … for each form page.
- Confirmation text: `goals/<campaign>/hidden_files/<run_id>/screenshots/<app_id>_confirmation.txt`
  (the exact confirmation string read from the confirmation page, saved verbatim).
- The tailored resume uploaded is the input `pdf_path`; its sha256 is the input `resume_hash`
  (re-verified at step 3 — the file actually uploaded must hash to the same value).

The `applying → submitted` transition MUST carry evidence with all four fields:
`{confirmation, screenshot_path, resume_path, resume_hash}`. A submit without all four
is incomplete — do not mark submitted until the confirmation screenshot file exists on
disk and the confirmation text file is written. Before the transition, append the
`event_log` row with all evidence paths so a lost transition never loses the evidence.

### Intent-before-submit protocol (follow exactly, in order)

1. **Write intent first.** Generate a fresh uuid4 `intent_id`. Call `app_transition(app_id, reviewed → applying, intent_id=<uuid>, evidence={url})`. **If the row is not in `reviewed` state, the transition is refused — stop immediately.** This is the double-claim guard; do not open the browser.
2. **Fill the form** per `playbooks/<ats_type>.md`. Screenshot every page before and after filling.
3. **Re-verify the upload.** Hash the exact file bytes about to be uploaded and compare to the input `resume_hash`. Mismatch → `app_transition(app_id, applying → blocked, evidence={reason: "hash_mismatch"})` and **stop**.
4. **Click submit exactly once.** Never click twice. Never re-submit while an intent is unresolved.
5. **Capture evidence.** Read the confirmation string on the confirmation page and take a screenshot.
   Save both to the canonical paths (see "Evidence capture" above): the screenshot as
   `<app_id>_confirmation.png` and the confirmation string verbatim as
   `<app_id>_confirmation.txt`. Verify both files exist on disk. Then
   `app_transition(app_id, applying → submitted, evidence={confirmation, screenshot_path, resume_path, resume_hash})`
   where `resume_path` is the exact `pdf_path` uploaded and `resume_hash` is the re-verified sha256.
   If the screenshot could not be captured (tool failure), record `screenshot_path: null` and the
   reason honestly in evidence — never claim a screenshot that does not exist.

### Mid-form branches

- Unknown mandatory question → `approval_enqueue` (kind `screening_question`, with `app_id`), then `app_transition(app_id, applying → needs_me, evidence={approval_id, field})`. Never guess.
- **Mandatory cover-letter field** → if `cover_letter_path` + `cover_letter_hash` were supplied (reviewer-approved), hash-verify the file bytes and attach/upload per the ATS playbook; record `cover_letter_path` in the submitted evidence. If no approved letter was supplied, treat it like any unknown mandatory field: `approval_enqueue` → `needs_me`. Never write a letter at the portal.
- CAPTCHA / SMS / bot-wall → `app_transition(app_id, applying → parked, evidence={reason, checkpoint_path})`. **Never bypass.** Park the URL + filled-field snapshot so a human can resume.
- "Already applied" banner → `app_transition(app_id, applying → blocked, evidence={reason: "duplicate_portal", screenshot_path})`.
- Newly discovered ATS quirks (wrong `ats_type` detected, new banner text, new park cause) → `companies_update` with the correction or `park_count` increment.

## Output

The verdict envelope:

```json
{"skill":"portal-navigator","version":"1.1.0","verdict":"pass|hold|reject",
 "score":0-100,"reasons":["..."],
 "evidence":{"intent_id":"<uuid>","confirmation":"<string>","screenshot_path":"<path>"},
 "tokens":1234}
```

- `pass` → `submitted`, confirmation string captured.
- `hold` → `parked` or `needs_me`, with the checkpoint path or `approval_id` in evidence.
- `reject` → `blocked` (hash mismatch, duplicate_portal, or the double-claim guard tripped).

## Hard limits

- Intent before submit, always. No submit click without a recorded `applying` row carrying this run's `intent_id`.
- Never click submit twice for one `app_id`. Never re-submit while a previous intent is unresolved.
- Never bypass CAPTCHA, SMS verification, or bot-walls — park instead.
- Never guess a form answer — enqueue it.
- Screenshot every page of the flow, including the confirmation page.
- Report ATS quirks via `companies_update`; do not silently work around the same quirk twice.
- Append exactly one `event_log` row on exit (`run_id`, `app_id`, verdict, token count), even on failure.
