<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

---
name: account-connector
version: "1.0.0"
description: Connect the customer's job-board and mailbox accounts once at onboarding, so campaigns never stall mid-run on a login wall.
---

# account-connector

Collect every login the harness needs, once, during install onboarding — then
verify it. This skill runs **with the customer in the Muse client**: secure
login cards render in chat, never in a raw terminal. If the customer is
driving a terminal install, the agent hands off to the chat for this step.

## The account checklist

| Account | Collection method | Used by |
|---|---|---|
| LinkedIn | Secure Vault login card (`credentials.request_login`, page_url `https://www.linkedin.com/login/`) | linkedin_feed scout, linkedin_replier inbox scans, Easy Apply |
| Dice | Secure Vault login card (site's real login page) | job_board campaign |
| Indeed | Secure Vault login card (site's real login page) | job_board campaign |
| ZipRecruiter | Secure Vault login card (site's real login page) | job_board campaign |
| Glassdoor | Secure Vault login card (site's real login page) | job_board campaign, company intel |
| Outlook | Microsoft connector (Accounts Center connect link) | email_scan, email_replier |
| Gmail | Gmail connector (Accounts Center connect link) | optional — only when the customer wants it |

## Procedure

1. **Check what's already connected.** Call `credentials.list` (metadata only —
   never values) and each connector's status check. Build the pending list:
   every account above with no saved login or connection.
2. **Collect, one account at a time.** For each pending job-board account,
   send the customer one `credentials.request_login` card with `page_url`
   built from the site's real login page (scheme + host + path only, drop
   query parameters). For Outlook/Gmail, send the connector's connect link
   instead — never a password card for a connector-backed mailbox.
3. **Respect skips.** An account the customer declines is recorded as
   `skipped` and never re-prompted in this run. Skipped accounts become the
   run-start gate's concern (they hold at run start, they don't stall mid-run).
4. **Verify.** After collection, confirm every saved login reappears in
   `credentials.list` and every connector reports connected.
5. **Report.** One concise summary to the operator: account → `connected` |
   `skipped` | `failed` (with reason); what each campaign can now reach; and
   the consequence of each skip (campaigns needing it hold at run start).

## Hard limits

- Credentials go ONLY to the Secure Vault or the connector's own flow.
  Never write a password, code, or token into a file, the persona YAML, the
  DB, chat prose, or a URL.
- Never invent a login. A missing login is `skipped` / `failed`, never a guess.
- One card at a time; wait for each submission before sending the next.
- This skill never signs in anywhere itself — it only collects. Sign-in
  happens later in the customer's browser session through the normal
  saved-login flow.
