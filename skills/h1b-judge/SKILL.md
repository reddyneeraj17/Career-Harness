---
name: h1b-judge
version: "1.0.0"
description: Scores a company's H-1B sponsorship record via lookup and applies the profile's hard/soft gate.
---

# H-1B Judge

Looks up a company's H-1B sponsorship history and scores it 0–100, then applies the customer's gate policy. This is a verdict-only skill: it judges, the coordinator transitions.

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
{"skill":"h1b-judge","version":"1.0.0","verdict":"pass|reject|hold",
 "score":0-100,"reasons":["..."],
 "evidence":{"approvals":123,"denials":4,"years":["2021","2022","2023","2024","2025"],"lca_count":210,"gate":"soft|hard"},"tokens":1234}
```

- `gate=hard` → `reject` if score < 40; `pass` otherwise.
- `gate=soft` → `pass` with the score recorded in `evidence` for downstream ranking; a low score ranks the row down, it does not kill it.
- Unknown company (no record returned by `h1b_lookup`) → `hold` with reason `unknown — needs careers-page check`.

## Hard limits

- Never invent a score. If `h1b_lookup` returns no record, the verdict is `hold` — a fabricated number is forbidden.
- If `work_auth.sponsor_required` is false, return `pass` with score 100 and reason `sponsorship not required`; do not spend a lookup.
- The score formula is fixed: weight recent-year approvals and LCA volume; document the formula version in `reasons` if it ever changes.
- Gate policy comes from Inputs only — the skill never overrides `hard`/`soft`.
- No personal data lives in this file; all customer facts arrive via Inputs.
- Append exactly one `event_log` row on exit. No state transitions — the coordinator owns them.
