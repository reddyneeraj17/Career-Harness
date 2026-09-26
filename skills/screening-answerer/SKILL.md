<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

---
name: screening-answerer
version: "1.1.0"
description: Answers one application screening question from the client persona (Excel-loaded) first, then standing profile answers; holds anything unknown for user review.
---

# screening-answerer

## Inputs

```json
{
  "question": "Are you willing to relocate?",
  "field_name": "relocate",
  "persona": {
    "identity": {"full_name": "...", "phone": "...", "email": "...", "city": "..."},
    "work_auth": {"status": "H-1B (transfer needed)", "sponsorship_sentence": "..."},
    "years_matrix": {"Python": 9, "SQL": 9},
    "preferences": {"work_mode": "...", "relocation": "...", "max_travel": "...", "min_base_salary": "..."},
    "screening": {"answers": {"relocate": "Yes", "drivers_license": "Yes"}}
  },
  "profile_answers": {"relocate": "Yes", "drivers_license": "Yes", "degree_dates": "decline"},
  "app_id": "app-9f2c…"
}
```

`persona` is the client persona the run-coordinator loaded at run start
(`profiles/<client_id>.yaml` — built from the onboarding Excel). It carries
far more than the standing answers, so it is consulted first.

## Lookup order

1. **`persona.screening.answers`** — exact key match on `field_name`, then
   unambiguous semantic match on the question text. The answer ships
   verbatim, exactly as the client wrote it in the Excel's Screening Answers
   tab.
2. **Derived from persona sections** — only when the question maps cleanly
   to one field:
   - "years of experience with X" → `persona.years_matrix[X]` (exact skill
     name, case-insensitive). The number ships as-is.
   - sponsorship / work authorization → `persona.work_auth` (status and the
     client's own sponsorship sentence, pasted unedited).
   - work mode, relocation, travel, salary/comp → `persona.preferences`.
   - name, email, phone, city/state → `persona.identity`.
3. **`profile_answers`** — the standing answers from `profile_get`, as
   before (exact key, then unambiguous meaning).
4. **Unknown → hold for user review.** `approval_enqueue` kind
   `screening_question` with `app_id`, the exact `question`, and
   `field_name`. The user reviews and the answer is recorded once — never
   asked twice, never guessed.

## Actions called

- `approval_enqueue` — when the question cannot be answered from `profile_answers`. Enqueue kind `screening_question` with `app_id`, the exact `question`, and `field_name`.
- `event_log` — one row on exit with the verdict and token count.

## Output

The verdict envelope:

```json
{"skill":"screening-answerer","version":"1.1.0","verdict":"pass|hold",
 "score":0-100,"reasons":["..."],
 "evidence":{"answer":"Yes","source":"persona.screening.answers"},
 "tokens":1234}
```

- `pass` → `evidence.answer` holds the exact profile answer.
- `hold` → `evidence` is `{"held": true, "approval_id": "<id>"}`; the question is queued for the human, never guessed.

`score` = match confidence of question → profile key (100 on exact key match).

## Hard limits

- **Persona first, profile second, user review last.** Check
  `persona.screening.answers`, then derivable persona sections, then
  `profile_answers`. Anything unmatched → `approval_enqueue`, never a guess.
- **Years are exact, never derived.** A "years of X" answer comes only from
  `years_matrix[X]`. Never round up, never infer from total years of
  experience, never borrow from a neighboring skill.
- **Verbatim means verbatim.** Screening answers and the sponsorship
  sentence ship exactly as the client wrote them — no rephrasing, no
  softening.
- **Unknown → `approval_enqueue`, never a guess.** No years, no salary, no
  dates, no "probably".
- **"Decline to answer" is a valid answer** when the profile says so (e.g., `degree_dates: decline`) — return it verbatim as `pass`, not as a hold.
- A recorded answer must never be asked twice — persistence is the coordinator's job; this skill only reports `held` with the `approval_id`.
- Never answer a question asking for credentials, passwords, or sensitive PII beyond the profile — hold it.
- Append exactly one `event_log` row on exit (`app_id`, verdict, token count).
