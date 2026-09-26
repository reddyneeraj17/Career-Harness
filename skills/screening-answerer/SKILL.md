---
name: screening-answerer
version: "1.0.0"
description: Answers one application screening question strictly from the candidate's profile answers; holds anything unknown for review.
---

# screening-answerer

## Inputs

```json
{
  "question": "Are you willing to relocate?",
  "field_name": "relocate",
  "profile_answers": {"relocate": "No", "drivers_license": "Yes", "degree_dates": "decline"},
  "app_id": "app-9f2c…"
}
```

`profile_answers` is the full standing-answers map from `profile_get`. Match on `field_name` first, then on unambiguous meaning of `question`.

## Actions called

- `approval_enqueue` — when the question cannot be answered from `profile_answers`. Enqueue kind `screening_question` with `app_id`, the exact `question`, and `field_name`.
- `event_log` — one row on exit with the verdict and token count.

## Output

The verdict envelope:

```json
{"skill":"screening-answerer","version":"1.0.0","verdict":"pass|hold",
 "score":0-100,"reasons":["..."],
 "evidence":{"answer":"No"},
 "tokens":1234}
```

- `pass` → `evidence.answer` holds the exact profile answer.
- `hold` → `evidence` is `{"held": true, "approval_id": "<id>"}`; the question is queued for the human, never guessed.

`score` = match confidence of question → profile key (100 on exact key match).

## Hard limits

- **Answer ONLY from `profile_answers`.** Exact key match, or an unambiguous semantic match ("willing to relocate" → `relocate`). Ambiguous → hold.
- **Unknown → `approval_enqueue`, never a guess.** No years, no salary, no dates, no "probably".
- **"Decline to answer" is a valid answer** when the profile says so (e.g., `degree_dates: decline`) — return it verbatim as `pass`, not as a hold.
- A recorded answer must never be asked twice — persistence is the coordinator's job; this skill only reports `held` with the `approval_id`.
- Never answer a question asking for credentials, passwords, or sensitive PII beyond the profile — hold it.
- Append exactly one `event_log` row on exit (`app_id`, verdict, token count).
