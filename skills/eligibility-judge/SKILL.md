<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

---
name: eligibility-judge
version: "1.1.0"
description: Screens a job posting for hard eligibility — role type, location, and agency rules — from the profile, never from guesses; emits the canonical selected employment lane.
---

# Eligibility Judge

> Changelog 1.1.0 (2026-09-27): Emits canonical `selected_lane` plus `employment_types_offered` in evidence, per the multi-type posting rules. Ambiguous type is a hold, never an inference.

Decides whether a posting clears the hard eligibility gates (role type, location, agency/C2C) using only the customer profile. This is a verdict-only skill: it judges, the coordinator transitions.

## Inputs

```json
{
  "posting_id": "sha of company+role+url",
  "company": "Stripe",
  "role": "Senior Data Engineer",
  "url": "https://...",
  "jd_text": "full normalized job description text (may be empty)",
  "profile": {
    "role_types": ["full_time", "w2_contract"],
    "locations": {"us_only": true, "remote": "ok", "metros": ["Houston", "Dallas", "Austin"]},
    "c2c_allowed": false
  }
}
```

`profile` is passed in by the coordinator (from `profile_get`); the skill never fetches it itself.

## Lane selection (canonical `selected_lane`)

Employment types offered come only from the JD text (and the scout's
`employment_type_evidence` when present) — never from the vendor or company
name. Choose the lane the run will actually apply in:

- **One explicit type, and it is enabled** → `selected_lane` = that type.
- **One explicit type, not enabled** → `reject` with the exact profile
  mismatch reason (e.g. `rejected: part_time not in profile.role_types`).
- **Several allowed types** → record all of them in
  `employment_types_offered`, then choose the application lane: prefer an
  enabled lane; for "W2 or C2C" choose `c2c_contract` only when the posting
  or application genuinely permits C2C, otherwise `w2_contract`.
- **Ambiguous type** (the JD does not state it clearly) → `hold` for
  clarification when the type affects eligibility or H-1B routing; never
  infer it from the source name.
- **Unclear/unstated** → `employment_types_offered: ["unknown"]`,
  `selected_lane: "unknown"`; pass through on the other checks and let
  downstream stages hold on the missing fact.

## Actions called

- `event_log` — one row on exit with the verdict, reasons, and token count. Nothing else. This skill never writes to `applications` or any other table.

## Output

Return ONLY the verdict envelope JSON:

```json
{"skill":"eligibility-judge","version":"1.1.0","verdict":"pass|reject|hold",
 "score":0-100,"reasons":["..."],
 "evidence":{"posting_id":"...","checks":{"role_type":"pass|fail","location":"pass|fail|unknown","agency":"pass|fail|n/a"},
 "employment_types_offered":["w2_contract","c2c_contract"],"selected_lane":"w2_contract","selected_lane_evidence":"JD: 'W2 or C2C accepted'; C2C permitted on the application form"},"tokens":1234}
```

- `pass` — all applicable checks passed.
- `reject` — at least one hard check failed; `reasons` names which check and why.
- `hold` — the JD text is missing or insufficient to judge; **never judge from the title alone.**
- `selected_lane` is the canonical lane the coordinator uses for H-1B
  routing (`c2c_contract` → bypass) and for `screening-answerer`.
  `selected_lane_evidence` quotes the JD or form text that decided it.

## Hard limits

- Empty or whitespace-only `jd_text` → `hold` with reason `insufficient jd text`, always. Title-only judgment is forbidden.
- Role type must be in `profile.role_types`; anything else → `reject`.
- Location must satisfy `profile.locations` (US-only, remote policy, metro list as applicable); a posting that clearly violates them → `reject`; ambiguous → `hold`, never a guess.
- Agency/staffing-firm posts are judged on the offered employment type like any other posting — a vendor posting for an enabled lane (W2/C2C) passes; one offering only an unselected type → `reject`.
- Never invent facts: if a required check cannot be decided from `jd_text` + `profile`, the verdict is `hold`, not a guess.
- No personal data lives in this file; all customer facts arrive via Inputs.
- Append exactly one `event_log` row on exit. No state transitions — the coordinator owns them.
