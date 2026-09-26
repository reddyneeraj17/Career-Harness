<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

---
name: approval-judge
version: "1.0.0"
description: Triages the approval queue — auto-resolves only low-risk items answerable from profile answers.
---

# Approval Judge

Sweeps the approval queue and resolves what is safe to resolve: low-risk items whose answer already exists in `profile.answers`. Everything else is batched for the customer or escalated. This skill resolves approvals via `approval_resolve`; it never sends anything itself.

## Inputs

```json
{
  "items": [
    {"approval_id": "appr-001", "kind": "screening_question|reply_draft|send_confirm|other",
     "app_id": "app-123", "question": "Are you willing to relocate?",
     "options": ["Yes", "No"]}
  ],
  "profile_answers": {"relocate": "No", "restrictive_covenants": "Yes"}
}
```

`profile_answers` is passed in by the coordinator (from `profile_get`); the skill never fetches it itself.

## Actions called

- `approval_resolve` — with `{approval_id, answer}` for each `auto_resolved` item. Only items resolved by this skill are written; `batched` and `escalated` items are left untouched for the customer.
- `event_log` — one row on exit with per-item resolutions and token count. Nothing else.

## Output

Return ONLY the verdict envelope JSON:

```json
{"skill":"approval-judge","version":"1.0.0","verdict":"pass",
 "score":0-100,"reasons":["..."],
 "evidence":{"items":[
   {"approval_id":"appr-001","resolution":"auto_resolved|batched|escalated","answer":"No"}]},
 "tokens":1234}
```

- `auto_resolved` — low-risk item with the answer present in `profile_answers`; resolved via `approval_resolve`.
- `batched` — needs the customer; left in the queue for the next approval batch.
- `escalated` — high-risk or ambiguous; flagged for the operator with a reason.

`score` is the fraction auto-resolved (0–100); it measures queue throughput, not quality.

## Hard limits

- **Risk rubric — auto-resolve ONLY low-risk items whose answer exists verbatim in `profile_answers`.** Never auto-answer a question that is not in answers — not by paraphrase, not by inference.
- Creative content (reply drafts beyond the tier rules, any free-text the customer didn't pre-approve) is **never auto-approved** → `batched` for the customer, always.
- High-risk items (compensation numbers, specific call times, exclusivity, documents beyond the resume, anything touching credentials or money) → `escalated`, never `auto_resolved`.
- "Wait" semantics: an item the customer has explicitly held is never resolved by this skill.
- No personal data lives in this file; answers arrive via Inputs.
- Append exactly one `event_log` row on exit. This skill writes only via `approval_resolve` — it never sends replies or transitions applications.
