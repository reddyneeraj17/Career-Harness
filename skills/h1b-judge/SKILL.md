<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

---
name: h1b-judge
version: "1.1.1"
description: Scores a company's H-1B sponsorship record via lookup (formula fixed in the h1b_lookup action) and applies the profile's hard/soft gate.
---

# H-1B Judge

> Changelog 1.1.1 (2026-09-27): Documents the C2C bypass as a coordinator routing rule — this skill is never invoked for `selected_lane=c2c_contract`, has no bypass mode, and never emits a score for a lane it was not asked about. Formula and behavior unchanged.

Looks up a company's H-1B sponsorship history and scores it 0–100, then applies the customer's gate policy. This is a verdict-only skill: it judges, the coordinator transitions.

**C2C is not this skill's concern.** The coordinator never invokes this skill when `selected_lane=c2c_contract` (recorded as `H-1B bypass — C2C lane`); there is no bypass parameter and no fake pass. If this skill is ever invoked for a C2C posting by mistake, it must still do the honest thing — run the lookup, or hold when the record is unknown — never fabricate a score.

## Inputs

```json
{
  "company_norm": "stripe",
  "work_auth": {
    "status": "H-1B",
    "sponsor_required": true,
    "h1b_gate": "soft"
  }
}
```

`company_norm` follows the shared convention (lowercase, legal suffixes stripped, spaces collapsed). `h1b_gate` is `hard` or `soft`.

## Actions called

- `h1b_lookup` — with `{company: company_norm}`; returns the sponsor record (approvals/denials by fiscal year, LCA count, last refreshed) or an unknown-company result.
- `event_log` — one row on exit with the verdict, score, and token count. Nothing else.

## Output

Return ONLY the verdict envelope JSON:

```json
{"skill":"h1b-judge","version":"1.1.1","verdict":"pass|reject|hold",
 "score":0-100,"reasons":["..."],
 "evidence":{"approvals":123,"denials":4,"years":["2021","2022","2023","2024","2025"],"lca_count":210,"gate":"soft|hard"},"tokens":1234}
```

- `gate=hard` → `reject` if score < 40; `pass` otherwise.
- `gate=soft` → `pass` with the score recorded in `evidence` for downstream ranking; a low score ranks the row down, it does not kill it.
- Unknown company (no record returned by `h1b_lookup`) → `hold` with reason `unknown — needs careers-page check`.

## Hard limits

- Never invent a score. If `h1b_lookup` returns no record, the verdict is `hold` — a fabricated number is forbidden.
- If `work_auth.sponsor_required` is false, return `pass` with score 100 and reason `sponsorship not required`; do not spend a lookup.
- The score formula is fixed and lives in the `h1b_lookup` action — the
  skill never computes its own:
  `score = clamp(0..100, round(25 * log10(lca_count + 1) + min(40, evidence_years * 8)))`.
  Quote it, don't paraphrase it; if the action's formula ever changes, note
  the change in `reasons`.
- Gate policy comes from Inputs only — the skill never overrides `hard`/`soft`.
- No personal data lives in this file; all customer facts arrive via Inputs.
- Append exactly one `event_log` row on exit. No state transitions — the coordinator owns them.
