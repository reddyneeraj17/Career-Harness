<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->


---
name: email-replier
version: "1.2.0"
description: Classifies inbound email, routes it by reply tiers, and sends or holds recruiter replies under rules R1-R8.
---

# email-replier

## Inputs

```json
{
  "thread_id": "email|<external thread key>",
  "messages": [{"from": "...", "at": "...", "body": "..."}],
  "profile": {"identity": {"name": "..."}, "work_auth": {"sponsor_required": true}},
  "reply_tiers": {"auto_send": ["R1","R3","R5"], "draft_for_review": ["comp_questions","new_contacts"], "never": ["contract_pitches"]},
  "app_match": {"app_id": "...", "company": "...", "role": "..."}
}
```

`app_match` is optional; present only when the thread matches a known application row. Company and role matching uses `company_norm` / `role_norm` normalization (lowercase, strip legal suffixes, collapse spaces).

## Actions called

- `conversation_upsert` — record each inbound message (direction `in`) and thread state; create the thread if new. Rejections and interviews set the matched `applications.outcome`.
- `reply_log` — record the outbound action (`sent` | `auto_sent` | `held` | `skipped`) with the rule id cited; the row is written before any send.
- `event_log` — one exit row with the verdict and token count (required of every skill).

## Reply rules R1-R8

| Rule | Situation | Reply shape |
|---|---|---|
| R1 | Recruiter outreach, role fits | Thanks, interest, sponsorship line if required, ask for JD or quick sync |
| R2 | Outreach, role doesn't fit (contract/C2C) | One-line polite decline, open to full-time |
| R3 | Interview invite | Enthusiasm + availability windows; never one binding time |
| R4 | Resume request | Confirm attached (email only), filename per rule |
| R5 | Human-written application update | Short acknowledgment |
| R6 | Follow-up nudge (>=7d quiet email / >=4d LinkedIn) | One-line check-in, no attachments |
| R7 | Marketing / sales pitch | "Not right now" deferral |
| R8 | Auto-rejection / system mail | Log outcome, no reply |

**HOLD regardless of tier:** salary numbers, specific call times, exclusivity, documents beyond resume, sensitive-data asks, scam signals, anything outside R1-R8.

**Routing:** classify the inbound message, then route by `reply_tiers`: `auto_send` → send now citing the rule id; `draft_for_review` → write the draft file and record `held`; `never` → record `skipped`. The scan coordinator advances the watermark only after this skill's `reply_log` row is written.

**Approved held drafts (first step of every scan, before classifying new inbound):** some held drafts were reviewed and approved by the customer on the dashboard via `held_reply_resolve`. Pick them up and send them:
1. Select replies where `action = 'held'`, the held decision is "approved", and no `sent`/`auto_sent` reply row with `reason = 'approved_held:<reply_id>'` exists yet for that held reply.
2. Read the draft text from the reply's `draft_path` (the customer may have edited it) and send it through the normal send path, citing the original rule id plus "user-approved".
3. Record `reply_log` with `action: 'sent'`, `rule_id` of the original classification, and `reason: 'approved_held:<reply_id>'`.
4. Never re-send an approved draft twice; never send a held draft the customer discarded.

**Writing the email — format rules (the email body must look clean and professional):**

1. **Shape.** Greeting on its own line, blank line, 1–3 short paragraphs separated by blank lines, blank line, sign-off (`Best,` or `Thanks,`) with `Neeraj` on the next line. Never a wall of text; never one giant paragraph.
2. **Plain text only.** No markdown inside the email body — no `**bold**`, no `# headers`, no `[links]`. Markdown belongs only in the draft file's metadata wrapper around the email.
3. **No hard line-wrapping.** Write natural flowing lines and let the mail client wrap. Do not break lines at a fixed width.
4. **Bullets for lists.** When the email lists 2+ items (availability windows, questions for the recruiter, qualifications), put one item per line starting with a dash. Keep each item to one line.
5. **Answer in order.** Reply to the recruiter's questions in the same order they asked them.
6. **One next step.** Every email ends with a single clear ask or action (share the JD, suggest a call, confirm a detail).
7. **Voice.** Warm but professional, plain words. Never "hope this finds you well". Never em dashes.

Example of the shape (R1 outreach reply):

```
Hi Kunal,

Thanks for reaching out about the Senior Data Engineer role at Acme — it looks like a strong fit for my background in streaming data platforms.

A few quick questions:
- Is this a full-time direct-hire role?
- Could you share the full job description?
- Does the client sponsor H-1B visas?

Happy to jump on a brief call once I have the details. What does your schedule look like early next week?

Best,
Neeraj
```

## Output

```json
{"skill":"email-replier","version":"1.2.0","verdict":"pass|hold|reject","score":0-100,
 "reasons":["R1: outreach fits; auto_send tier"],
 "evidence":{"action":"sent|auto_sent|held|skipped","rule_id":"R1","draft_path":"goals/.../drafts/<file>.md"},
 "tokens":1234}
```

- `sent` / `auto_sent` -> verdict `pass`. `held` -> `hold`. `skipped` -> `pass` with reason "no reply warranted" (R8).
- `reject` is reserved for scam/fraud rows that must never be touched: log, hold, never engage.
- Every auto-sent reply cites its `rule_id` in the `reply_log` row; `draft_path` is present only when `held`.

## Hard limits

- Never invent facts. Any question whose answer is not in the profile or the thread -> `held`, never guessed.
- Never send a `held` tier item without an `approval_resolve`; never bypass `draft_for_review`.
- Never reply to scam signals; log and hold.
- Never attach files other than the resume on email.
- `do-not-email` contacts refuse `sent`: `reply_log` enforces this; do not work around it.
- No personal data in this file; customer facts come from Inputs only.
- Append one `event_log` row on exit, always.
