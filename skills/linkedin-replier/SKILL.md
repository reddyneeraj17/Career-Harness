<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

---
name: linkedin-replier
version: "1.1.0"
description: Classifies inbound LinkedIn messages, routes them by reply tiers, and sends or holds replies under rules R1-R8.
---

# linkedin-replier

## Inputs

```json
{
  "thread_id": "linkedin|<external thread key>",
  "messages": [{"from": "...", "at": "...", "body": "..."}],
  "profile": {"identity": {"name": "..."}, "work_auth": {"sponsor_required": true}},
  "reply_tiers": {"auto_send": ["R1","R3","R5"], "draft_for_review": ["comp_questions","new_contacts"], "never": ["contract_pitches"]},
  "app_match": {"app_id": "...", "company": "...", "role": "..."}
}
```

Same shape as email-replier, channel `linkedin`. `app_match` is optional; company and role matching uses `company_norm` / `role_norm` normalization.

## Actions called

- `conversation_upsert` — record each inbound message (direction `in`) and thread state; create the thread if new. Rejections and interviews set the matched `applications.outcome`.
- `reply_log` — record the outbound action (`sent` | `auto_sent` | `held` | `skipped`) with the rule id cited; the row is written before any send. `reply_log` refuses PDF attachments on `linkedin`.
- `event_log` — one exit row with the verdict and token count (required of every skill).

## Reply rules R1-R8 (LinkedIn channel)

Same rules as email-replier, with channel notes:

| Rule | Situation | Reply shape |
|---|---|---|
| R1 | Recruiter outreach, role fits | Thanks, interest, sponsorship line if required, ask for JD or quick sync |
| R2 | Outreach, role doesn't fit (contract/C2C) | One-line polite decline, open to full-time |
| R3 | Interview invite | Enthusiasm + availability windows; never one binding time |
| R4 | Resume request | Reference the resume by name (never attach); offer to send by email if asked |
| R5 | Human-written application update | Short acknowledgment |
| R6 | Follow-up nudge (>=4d LinkedIn quiet) | One-line check-in, no attachments |
| R7 | Marketing / sales pitch | "Not right now" deferral |
| R8 | Auto-rejection / system mail | Log outcome, no reply |

**HOLD regardless of tier:** salary numbers, specific call times, exclusivity, documents beyond resume, sensitive-data asks, scam signals, anything outside R1-R8.

**Routing:** classify, then route by `reply_tiers`: `auto_send` -> send citing rule id; `draft_for_review` -> draft file + `held`; `never` -> `skipped`. The LinkedIn inbox coordinator advances the watermark only after this skill's `reply_log` row is written.

**Voice:** 2-4 short sentences, plain words, like replying from a phone. Never em dashes. Never "hope this finds you well".

## Scan scope (inbox contract)

The LinkedIn inbox is scanned via browser task with these hard bounds:

- **Unread/filter-first:** open the unread filter first and triage unread threads before any read ones.
- **Thread cap:** read at most **10 threads per run**, newest-first since the `conversations` watermark.
- **Timebox:** stop the browser pass after **15 minutes** even if threads remain untriaged. Partial coverage is normal: report `threads_triaged` and `threads_skipped_timebox` in the run counts, and close the run.
- The watermark advances only over threads actually triaged (a reply row written), never over skipped-by-timebox threads.

## Output

```json
{"skill":"linkedin-replier","version":"1.1.0","verdict":"pass|hold|reject","score":0-100,
 "reasons":["R1: outreach fits; auto_send tier"],
 "evidence":{"action":"sent|auto_sent|held|skipped","rule_id":"R1","draft_path":"goals/.../drafts/<file>.md"},
 "tokens":1234}
```

- `sent` / `auto_sent` -> `pass`. `held` -> `hold`. `skipped` -> `pass` ("no reply warranted").
- `reject` reserved for scam/fraud rows: log, hold, never engage.
- Every auto-sent reply cites its `rule_id` in the `reply_log` row.

## Hard limits

- NEVER attach PDFs on LinkedIn. `reply_log` refuses them. Reference the resume by name instead; offer email delivery only if asked.
- Never invent facts. Any question not answerable from the profile or the thread -> `held`, never guessed.
- Never send a `held` tier item without an `approval_resolve`; never bypass `draft_for_review`.
- Never reply to scam signals; log and hold.
- No personal data in this file; customer facts come from Inputs only.
- Append one `event_log` row on exit, always.
