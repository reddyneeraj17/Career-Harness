<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

---
name: nudge-sweeper
version: "1.0.0"
description: Sweeps quiet threads for the R6 follow-up nudge — one polite check-in per aged thread with no reply, routed by the customer's reply tiers.
---

# nudge-sweeper

## Why this exists

Both replier skills define R6 (follow-up nudge on a quiet thread), but the
repliers only run when triaging an *inbound* message — and a quiet thread has
no inbound by definition. The rule was written but unreachable. This skill is
the reach: it sweeps aged threads and fires the nudge.

## Inputs

```json
{
  "channel": "email|linkedin",
  "quiet_days": 7,
  "run_id": "run-2026-09-26-001",
  "reply_tiers": {"auto_send": ["R6"], "draft_for_review": [], "never": []}
}
```

`quiet_days` is 7 for email, 4 for LinkedIn — the R6 thresholds. `reply_tiers`
comes from `profile_get`, same as the replier skills.

## Procedure

1. **Find quiet threads.** Read thread state via `snapshot()` (the
   `conversations` view): threads whose last activity is ≥ `quiet_days` old
   AND whose last message is not an unanswered inbound (an unanswered inbound
   is the replier's job, not this skill's). Eligible threads are ones where
   *we* sent last, or where our application went out and nothing came back.
2. **Exclude.** Never nudge: threads already nudged in the last 7 days (one
   nudge per thread per week — never nag), threads whose application outcome
   is `rejected`/`closed`/`hired`, do-not-contact / do-not-email addresses,
   and threads with a held draft already waiting on the customer.
3. **Draft the R6 nudge.** One line, no attachments, same voice as the
   repliers (2–4 short sentences, plain words, like replying from a phone):
   a light check-in referencing the role/company — e.g. "Circling back on
   the Senior Data Engineer role — happy to share anything else that'd help."
   Never em dashes, never "hope this finds you well".
4. **Route by tier** exactly like the repliers: `auto_send` → send citing
   R6; `draft_for_review` → write the draft file, record `held`;
   `never` → record `skipped`.
5. **Record.** `conversation_upsert` (direction `out`, R6 cited) then
   `reply_log` (`sent` | `auto_sent` | `held` | `skipped`) — the reply row is
   written before any send.

## Actions called

- `conversation_upsert` — direction `out`, thread state updated.
- `reply_log` — one row per nudge with rule id `R6`; refuses PDF attachments
  on `linkedin` and refuses do-not-email contacts.
- `event_log` — one row on exit with the verdict envelope and token count.

## Output

```json
{"skill":"nudge-sweeper","version":"1.0.0","verdict":"pass",
 "score":0-100,"reasons":["..."],
 "evidence":{"threads_swept":12,"nudged":[{"thread_id":"t-1","company":"Acme Health","route":"auto_sent"}],
             "skipped":[{"thread_id":"t-2","reason":"nudged 3d ago"}]},
 "tokens":1234}
```

## Hard limits

- **One nudge per thread per 7 days.** A second nudge inside the window is
  refused — check thread history first.
- **Quiet means quiet.** Only threads past the R6 threshold; never nudge a
  thread with recent activity.
- **Dead threads stay dead.** Rejected/closed/hired outcomes and
  do-not-contact entries are never nudged.
- **No attachments, no asks.** The nudge is a check-in, not a new pitch:
  no resume re-send, no salary talk, no call-time proposals.
- **HOLD regardless of tier** (same as the repliers): anything outside R6's
  shape goes to `held`, never sent.
