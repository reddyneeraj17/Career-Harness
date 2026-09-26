---
name: daily-report
version: "1.0.0"
description: Reads snapshot() and produces the short chat-ready daily report; silent when nothing is new.
---

# daily-report

## Inputs

```json
{
  "date": "2026-09-26"
}
```

`date` is optional; defaults to today in America/Chicago. The report covers activity since the last report (tracked via `snapshot` run and event watermarks), not just the calendar day.

## Actions called

- `snapshot` — read-only: `overview`, `applications`, `replies`, `runs`, `health` views. This skill never writes application state.
- `event_log` — one exit row with the verdict (required of every skill); the only write this skill performs.

## Report rules

- **Silence by default.** If nothing new happened since the last report — no submissions, no replies, no interviews, no blockers, no needs-you decisions — output `{"nothing_to_do": true}` in evidence and stay silent.
- **When something is new**, produce short chat-ready markdown: submitted (with company + role), parked/blocked with reasons, needs-you decisions (approvals awaiting the customer), replies and interviews received. Counts come from `snapshot`, never invented.
- Lead with what needs the customer (needs-you, interviews), then outcomes (replies), then volume (submitted), then blockers. One message, plain language.
- Never include sample data; if a `snapshot` view is unavailable, say which section is missing instead of guessing.

## Output

```json
{"skill":"daily-report","version":"1.0.0","verdict":"pass","score":0-100,
 "reasons":["2 submitted","1 interview reply","1 needs-you approval"],
 "evidence":{"nothing_to_do":false,"report":"## Daily report ..."},
 "tokens":1234}
```

- `nothing_to_do: true` -> the report is suppressed; verdict `pass` with reason "no new activity".
- `report` holds the chat-ready markdown when there is news. Verdict is always `pass` (a report is a read); a failed `snapshot` yields `hold` with the missing section named.

## Hard limits

- Read-only against application state. Never transition rows, never enqueue approvals, never touch `conversations` or `replies`.
- Never invent counts or outcomes; every number traces to a `snapshot` view.
- Never send the report itself to the customer; the main agent decides what reaches the phone. This skill returns the markdown.
- No personal data in this file; customer facts come from `snapshot` only.
- Append one `event_log` row on exit, always.
