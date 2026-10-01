<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

---
name: screening-answerer
version: "1.4.1"
description: Answers one application screening question from the client persona (Excel-loaded) first, then standing profile answers, honoring the posting's selected employment lane; holds anything unknown for user review.
---

# screening-answerer

> Changelog 1.4.1 (2026-09-30): Consistency guard — a derived or
> question-bank answer that contradicts a verbatim persona/profile value
> loses; the persona value ships and the conflict is logged in evidence.
> A default never overrides something the customer actually said.
> Changelog 1.4.0 (2026-09-30): Question-bank lookup — before holding, the
> skill consults the canonical `docs/PORTAL_QUESTION_BANK.md`: LOW-risk
> questions fill automatically from the bank default or the mapped persona
> field, MEDIUM-risk fill with the choice logged in evidence, HIGH-risk
> still hold. Fewer holds, same safety.
> Changelog 1.2.0 (2026-09-27): Accepts `selected_lane` (the posting's canonical employment lane from eligibility); lane context only selects among profile-stated facts — it never invents lane-specific claims. Unknown or lane-ambiguous questions still hold.
> Changelog 1.3.0 (2026-09-27): "Answer shaping" — per-type composition formats and length calibration for the DERIVED-answers path only; verbatim persona/profile answers are never reshaped, unknowns still hold.

## Inputs

```json
{
  "question": "Are you willing to relocate?",
  "field_name": "relocate",
  "selected_lane": "w2_contract",
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
`selected_lane` is the posting's canonical lane (e.g. `full_time`,
`w2_contract`, `c2c_contract`) decided by the eligibility judge; the
coordinator passes it at APPLY so lane-dependent questions are answered from
the right profile facts.

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
4. **`docs/PORTAL_QUESTION_BANK.md`** — the canonical question bank.
   Match the question to a bank entry (canonical key or listed phrasing):
   - LOW-risk → `pass` with the bank answer (persona-mapped field or bank
     default). `evidence.source` = `question-bank:<key>`, `evidence.risk` = `low`.
   - MEDIUM-risk → `pass` with the bank answer, and the deliberate choice
     (decline / Negotiable / 0 / consent accepted) is recorded in
     `evidence`. `evidence.risk` = `medium`.
   - HIGH-risk or no bank entry → hold (step 5).
   The bank never overrides a persona or profile value found in steps 1–3.
5. **Unknown → hold for user review.** `approval_enqueue` kind
   `screening_question` with `app_id`, the exact `question`, and
   `field_name`. The user reviews and the answer is recorded once — never
   asked twice, never guessed.

## Answer shaping (DERIVED answers only)

Shaping applies ONLY to answers composed on the derived path (lookup step
2). Verbatim answers from `persona.screening.answers` (step 1) and
`profile_answers` (step 3) ship exactly as written — never reshaped, never
reworded. Unknowns still hold.

**Per-type composition formats:**

- **Experience/background** ("How many years with X?", "Describe your
  experience with Y"): `[Technology] — [X years]. [One sentence: what you
  used it for, anchored to a real project from the persona.]` Years come
  only from `years_matrix`; the project anchor must be a real one.
- **Behavioral/situational** ("Tell me about a time…", "How do you
  handle…"): condensed STAR without labels — first-person, 3–4 sentences,
  end on the result. Every detail traceable to persona facts.
- **Why-this-company/role:** one specific JD-anchored reason + one
  persona-anchored fit fact. No generic praise.
- **Open-ended** ("Tell us about yourself"): 2–3 sentences — current
  scope, key strengths with one anchored result, what you're looking for
  (from preferences).

**Length calibration (hard limits):**

| Field type | Limit |
|---|---|
| Single-line input | 1 sentence |
| Short answer | 2–4 sentences |
| Textarea / long answer | 100–250 words |

**Anti-patterns (never in a derived answer):**

- Don't repeat the JD back ("I see you need Spark…" with nothing added).
- No generic trait claims ("hard worker", "fast learner", "detail-oriented")
  without an anchored fact.
- Don't over-qualify or apologize for gaps. Rewrite instead of hedging:
  "While I may not have exactly 5 years…" →
  "The role mentions 5 years — I'm at 3, but the systems I've shipped are
  production-facing." (Years honest per the years rule; the adjacent
  strength must be a persona fact.)

## Lane handling

`selected_lane` tells the skill which employment arrangement this posting
uses. It narrows — never invents:

- Employment-type questions ("open to C2C?", "willing to work W2?") resolve
  only from profile-stated facts: `persona.preferences`, `profile.role_types`
  (an enabled lane is a "yes" the client already gave), and standing
  screening answers. If the profile does not state it → `hold`, never
  assume the client accepts the lane.
- The sponsorship sentence and work-auth status ship verbatim regardless of
  lane — the lane does not rewrite the client's own words.
- A question whose correct answer genuinely differs by lane (e.g. expected
  rate for C2C vs salary for full-time) must find the lane-appropriate value
  in persona/profile facts; absent the value → `hold`.

## Actions called

- `approval_enqueue` — when the question cannot be answered from `profile_answers`. Enqueue kind `screening_question` with `app_id`, the exact `question`, and `field_name`.
- `event_log` — one row on exit with the verdict and token count.

## Output

The verdict envelope:

```json
{"skill":"screening-answerer","version":"1.3.0","verdict":"pass|hold",
 "score":0-100,"reasons":["..."],
 "evidence":{"answer":"Yes","source":"persona.screening.answers","selected_lane":"w2_contract"},
 "tokens":1234}
```

- `pass` → `evidence.answer` holds the exact profile answer.
- `hold` → `evidence` is `{"held": true, "approval_id": "<id>"}`; the question is queued for the human, never guessed.

`score` = match confidence of question → profile key (100 on exact key match).

## Hard limits

- **Persona first, profile second, user review last.** Check
  `persona.screening.answers`, then derivable persona sections, then
  `profile_answers`. Anything unmatched → `approval_enqueue`, never a guess.
- **Lane context selects; it never invents.** `selected_lane` only picks
  which profile-stated fact applies. It never authorizes a claim the client
  did not make (no invented C2C rate, no assumed W2 willingness).
- **Years are exact, never derived.** A "years of X" answer comes only from
  `years_matrix[X]`. Never round up, never infer from total years of
  experience, never borrow from a neighboring skill.
- **Verbatim means verbatim.** Screening answers and the sponsorship
  sentence ship exactly as the client wrote them — no rephrasing, no
  softening.
- **Consistency guard.** If a derived (step 2) or question-bank (step 4)
  answer contradicts a verbatim persona or profile value from steps 1–3,
  the verbatim value wins. Ship the persona value as `pass` and record
  the conflict in evidence (`evidence.conflict_resolved: "<what lost>"`).
  A default never overrides something the customer actually said.
- **Unknown → question bank → `approval_enqueue`, never a guess.** An
  unmatched question is checked against `docs/PORTAL_QUESTION_BANK.md`
  first (LOW/MEDIUM fill, HIGH holds). No years, no salary, no
  dates, no "probably".
- **"Decline to answer" is a valid answer** when the profile says so (e.g., `degree_dates: decline`) — return it verbatim as `pass`, not as a hold.
- A recorded answer must never be asked twice — persistence is the coordinator's job; this skill only reports `held` with the `approval_id`.
- Never answer a question asking for credentials, passwords, or sensitive PII beyond the profile — hold it.
- Append exactly one `event_log` row on exit (`app_id`, verdict, token count).
