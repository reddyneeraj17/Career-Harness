<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

---
name: eligibility-judge
version: "1.0.0"
description: Screens a job posting for hard eligibility — role type, location, and agency rules — from the profile, never from guesses.
---

# Eligibility Judge

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

## Actions called

- `event_log` — one row on exit with the verdict, reasons, and token count. Nothing else. This skill never writes to `applications` or any other table.

## Output

Return ONLY the verdict envelope JSON:

```json
{"skill":"eligibility-judge","version":"1.0.0","verdict":"pass|reject|hold",
 "score":0-100,"reasons":["..."],"evidence":{"posting_id":"...","checks":{"role_type":"pass|fail","location":"pass|fail|unknown","agency":"pass|fail|n/a"}},"tokens":1234}
```

- `pass` — all applicable checks passed.
- `reject` — at least one hard check failed; `reasons` names which check and why.
- `hold` — the JD text is missing or insufficient to judge; **never judge from the title alone.**

## Hard limits

- Empty or whitespace-only `jd_text` → `hold` with reason `insufficient jd text`, always. Title-only judgment is forbidden.
- Role type must be in `profile.role_types`; anything else → `reject`.
- Location must satisfy `profile.locations` (US-only, remote policy, metro list as applicable); a posting that clearly violates them → `reject`; ambiguous → `hold`, never a guess.
- Agency/staffing-firm posts (recruiter or agency posting on behalf of a client) → `reject` unless `profile.c2c_allowed` is true.
- Never invent facts: if a required check cannot be decided from `jd_text` + `profile`, the verdict is `hold`, not a guess.
- No personal data lives in this file; all customer facts arrive via Inputs.
- Append exactly one `event_log` row on exit. No state transitions — the coordinator owns them.
