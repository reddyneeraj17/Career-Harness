<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

---
name: linkedin-optimizer
version: "1.0.0"
description: Audits the customer's live LinkedIn profile, proposes per-section rewrites (headline, About, experience, skills, visibility) with recruiter keyword strategy, and applies only customer-approved sections — every edit verified. Read-only until per-section approval.
---

# linkedin-optimizer

## Why this exists

Recruiter inbound is a major channel and the LinkedIn profile is its landing
page. This skill optimizes the profile for recruiter search visibility and
engagement using a fixed playbook: headline formula, About-section
structure, keyword placement weights, the All-Star completeness checklist,
and the technical-bullet formula for experience. It never edits without a
per-section approval, and it never touches a profile that is not the
customer's own (matched against `profile.identity.name`).

## Inputs

```json
{
  "phase": "audit|propose|apply",
  "sections": ["headline", "about", "experience", "skills", "visibility"],
  "profile_url": "https://www.linkedin.com/in/<customer-handle>",
  "approvals": {"headline": "<approval_id>", "about": "<approval_id>"},
  "run_id": "run-...",
  "campaign_id": "linkedin_optimize"
}
```

- `phase` selects the step. `audit` and `propose` take no approvals.
  `apply` takes `approvals`: section → approval id, resolved `approved`.
- `profile_url` must be the customer's own LinkedIn profile URL. Any other URL → `reject`.
- Facts come from the resume variant + profile only (see Hard limits).

## Identity gate (FIRST step of every phase, no exceptions)

1. Load the live profile at `profile_url` via the browser.
2. Read the profile's display name. It must match `profile.identity.name`
   (the customer's own name).
3. Any other name (including a different account signed in, e.g. a
   borrowed or shared session) → verdict `reject`, reason
   `identity_gate_failed`, and STOP. No audit, no proposals, no edits.
   Never touch another person's profile.

## Phase 1 — audit (read-only)

1. Pass the identity gate.
2. Read each section in `sections`: headline, About, experience entries,
   skills list, visibility settings (Open-to-Work status, profile-viewing
   options — read only, never toggled here).
3. Score each section against the **All-Star checklist** (photo present,
   custom headline, current + 2 past roles with descriptions, education,
   5+ skills, industry + postal code, 50+ connections; stretch: banner
   image, Featured section, 1500+ char About, 5+ recommendations, all 50
   skills used).
4. Run a **keyword-coverage check**: derive recruiter-search terms from the
   profile's targeting (titles, skills, industries) and check their
   presence per section, weighted by placement (headline highest, then
   About, then experience, then skills). Note gaps — never keyword-stuff.
5. Write the audit to
   `goals/linkedin_optimize/hidden_files/<run_id>/audit.md` with per-section
   scores and the keyword gap list.
6. Output `pass` with `evidence.audit_path` and per-section scores.

## Phase 2 — propose (no edits)

1. Pass the identity gate.
2. For each section in `sections`, draft a rewrite using the playbook:
   - **Headline:** `[Role] | [Key Expertise] | [Value Proposition]`,
     ≤ 220 characters, built from recruiter-search keywords. Every term
     must be a true capability (resume variant or profile).
   - **About:** 1500–2000 characters. First ~300 characters are the
     preview hook (what shows before "see more") — role + value + one
     anchored result. Then 3 short paragraphs (who you are, what you've
     shipped with verbatim metrics, what you're looking for), a skills
     line, and a CTA (open to senior/staff data & AI roles; DM or email).
   - **Experience:** bullets via the technical-bullet formula
     `[action verb] + [technical what] + [scale/impact] + [technology
     used]` — metrics verbatim from the resume variant or omitted, never
     invented.
   - **Skills:** up to 50, ordered by targeting relevance; no invented
     skills, no proficiency claims beyond the variant.
   - **Visibility:** recommendations only — Open-to-Work titles/locations/
     types, profile-viewing options, creator-mode style toggles. These are
     **propose-only**: the skill drafts the recommendation text; it never
     applies visibility or identity-visible changes itself.
   - **Recommendations strategy** (advisory, in the proposal doc):
     target 5–10, give-first (write genuine recommendations for former
     colleagues), and when requesting, suggest 2–3 talking points tied to
     real shared work.
3. Write `goals/linkedin_optimize/hidden_files/<run_id>/proposal.md` with
   per-section current-vs-proposed diffs.
4. Enqueue **one approval per section** via `approval_enqueue`, kind
   `linkedin_section`, carrying: section name, current text, proposed text,
   and the proposal doc path. No section is ever edited without its own
   approval.
5. Output `pass` with `evidence.proposal_path` and per-section approval ids.

## Phase 3 — apply (approved sections only)

1. Pass the identity gate.
2. For each section in `sections` whose approval resolved `approved`:
   edit that section via the browser to the approved text, then **re-read
   the section and verify the edit landed** (compare the live text to the
   approved text). Record before/after hashes in the evidence.
3. Sections without an `approved` resolution are left untouched — no
   partial edits, no "close enough" substitutions.
4. Any edit that cannot be verified → verdict `reject` with reason
   `edit_unverified` naming the section; already-applied sections stay
   applied and are reported.
5. Output `pass` with per-section before/after hashes.

## Run bootstrap (dashboard-triggered manual run)

1. The customer clicks **Optimize LinkedIn** on the dashboard Overview tab → the
   `linkedin_optimize_start` action creates a run row
   (`campaign_id: linkedin_optimize`, `mode: manual`, `status: running`) and
   returns its `run_id`. It refuses to stack a second run while one is active.
2. The operator's agent then runs this skill's **audit → propose** phases
   against that `run_id` (one browser task for the whole run, identity gate
   first), enqueues exactly one `linkedin_section` approval per section via
   `approval_enqueue`, and calls `linkedin_optimize_proposal_complete`
   (`verdict: pass`). The run then waits on the customer in the approval queue.
3. Each approval resolution dispatches **apply for that section only**: the
   agent re-verifies identity, applies the approved (possibly edited) text,
   and calls `linkedin_optimize_apply_complete` with before/after hashes.
4. When every approved section is applied (or discarded), the agent closes the
   run with `run_close`. The run trace shows: audit → propose → awaiting
   approvals → apply → done, all visible in the existing event feed.

## Actions called

- `snapshot` — read-only run context (for `run_id`/`campaign_id`).
- `approval_enqueue` — one per section in `propose` (kind
  `linkedin_section`); never for any other purpose.
- `event_log` — exactly one row per phase on exit (phase, verdict, token
  count). This skill makes no state transitions — the coordinator (or the
  dashboard dispatch) owns them.

## Output

```json
{"skill":"linkedin-optimizer","version":"1.0.0","verdict":"pass|reject|hold",
 "phase":"audit|propose|apply",
 "score":0-100,"reasons":["..."],
 "evidence":{"audit_path":"goals/linkedin_optimize/hidden_files/<run_id>/audit.md",
             "proposal_path":"goals/linkedin_optimize/hidden_files/<run_id>/proposal.md",
             "section_scores":{"headline":62,"about":40,"experience":71,"skills":55,"visibility":30},
             "approvals":{"headline":"<approval_id>","about":"<approval_id>"},
             "applied":{"headline":{"before":"<hash>","after":"<hash>"}}},
 "tokens":1234}
```

- `pass` → phase completed as specified.
- `reject` → identity gate failed, wrong profile URL, or an edit could not
  be verified. Nothing was changed (except already-verified applied
  sections, which are reported).
- `hold` → the live profile could not be loaded (session issue, page
  error) — nothing proposed, nothing edited.

`score` = mean section score (audit) or share of sections completed
(propose/apply), honest, never inflated.

## Hard limits

- **Identity gate first, every phase.** The profile must belong to the customer
  (display name matches `profile.identity.name`) or the skill aborts immediately.
- **Facts only from the resume variant + profile.** No invented titles,
  metrics, skills, employers, or dates. Keyword optimization without
  stuffing: exact recruiter terms, natural density, never a keyword salad.
- **Read-only until per-section approval.** `audit` and `propose` never
  edit. `apply` edits only sections with an `approved` approval and
  verifies each edit by re-reading.
- **Propose-only for visibility settings, the Open-to-Work badge, and any
  content posting.** The skill never publishes posts or toggles
  identity-visible settings unilaterally.
- **No unverified lift claims.** The audit may note photo/banner presence;
  it never asserts view multipliers or recruiter-response statistics.
- **Browser-agnostic contract.** Browser steps run through the eligible
  browser-task route delegated by the parent; the skill describes what to
  read/edit/verify, never how to drive the browser.
- Append exactly one `event_log` row per phase on exit. No state
  transitions — the coordinator owns them.
