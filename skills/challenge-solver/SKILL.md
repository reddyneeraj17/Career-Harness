<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

---
name: challenge-solver
version: "1.0.0"
description: Handles mid-application portal challenges — CAPTCHA tiers, email OTP codes, and email verification links — inside the live browser session. Invoked by portal-navigator during APPLY; solves what is safely solvable, parks the rest with evidence. Never bypasses bot-walls, never uses third-party solving services.
---

# challenge-solver

> Changelog 1.0.0 (2026-09-30): New skill. CAPTCHA tier handling (checkbox
> auto-click, image-select one vision attempt, text/bot-wall park), email-OTP
> retrieval from the authorized mailbox with one resend, verification-link
> activation inside the same browser session. Transient codes are never
> written to evidence.

## When it runs

`portal-navigator` invokes this skill — never the coordinator directly —
the moment an application hits one of:

- `captcha_checkbox` — "I'm not a robot" style checkbox
- `captcha_image` — select-all-images challenge
- `captcha_text` — distorted text entry
- `bot_wall` — Cloudflare / PerimeterX / DataDome hard block
- `otp_email` — portal sent a code to the customer's mailbox
- `otp_sms` — portal sent a code by text message
- `verification_link` — portal sent an email link to verify/activate
- `account_creation` — portal requires creating an account mid-apply

The invocation carries `app_id`, `challenge_type`, the portal domain, and
the live browser session reference. The solver works **inside that same
session** — cookies and login state carry over.

## Authorization basis

- The customer's onboarding authorizes mailbox scanning
  (`accounts.mailbox_scan`) and portal account creation
  (`accounts.portal_creation.may_create`).
- OTP codes and verification links are used transiently in-session and
  **never written to evidence rows, logs, or the persona**. Evidence records
  *that* an OTP was entered (timestamp, sender), never the code.

## CAPTCHA tiers

| Challenge | Action |
|---|---|
| Checkbox ("I'm not a robot") | **Click it.** This is the customer acting through their agent — the same click they would make. One attempt; if it escalates to an image challenge, apply the image tier. |
| Image-select ("select all traffic lights") | **One vision attempt.** Look at the images, select, submit. If the portal rejects it or a second round appears → park. Never loop, never retry more than once. |
| Distorted text CAPTCHA | **Park immediately.** Cannot be solved reliably — park with `captcha_text` evidence. |
| Bot-wall / hard block (Cloudflare, PerimeterX, DataDome) | **Park immediately. Never bypass.** No third-party CAPTCHA-solving service, ever — no 2captcha, no Anti-Captcha, nothing external. |

A parked CAPTCHA keeps the filled-field snapshot + URL as the checkpoint so
a human (or a later run) can resume exactly where it stopped.

## Email OTP flow

1. Trigger the portal's "send code" if not already sent.
2. Read the authorized mailbox for the newest message from the portal's
   domain within the last 10 minutes (subject/body scan for a 4–8 digit
   code). The mailbox reader is the same one the email skills use.
3. Enter the code into the session's OTP field and submit.
4. **No email within ~3 minutes** → click the portal's resend **once**,
   wait again. Still nothing → park with evidence `otp_no_email`
   (transient — a fresh code resumes it). Never `blocked`/`failed` for this.
5. **Code rejected / expired** → park with evidence `otp_expired`. The
   operator requests a fresh code and resumes. Never fail the application.
6. One OTP challenge per application per run — if the portal asks twice,
   park with `otp_repeated`.

## Verification-link flow

1. Read the authorized mailbox for the verification email (last 10 min,
   portal domain).
2. Extract the verification/activation link.
3. **Open it in the same browser session** — not a fresh tab, not a text
   fetch. Session continuity is what activates the account.
4. Complete the landing step (click Verify / Confirm / Activate).
5. Return to the application flow and continue.

## SMS OTP

**Park with `otp_sms`.** The harness has no SMS access; the customer (or
operator) enters the code and the run resumes from the checkpoint. Never
ask the customer to paste codes into chat as a routine path.

## Account creation

When a portal requires an account before applying:

1. Only if `accounts.portal_creation.may_create` is true — otherwise park
   with `account_required`.
2. Create with the job-search email; the password is set by the customer
   inside Muse's vault — the solver never invents or stores one.
3. Complete any email-verification step via the verification-link flow.
4. Record the new portal account in evidence (platform + email, never the
   password).

## Actions called

- Mailbox read (via the authorized mailbox reader) — OTP codes and links.
- `app_transition` — only via the invoking portal-navigator; the solver
  itself never transitions state.
- `event_log(run_id, type, payload)` — exactly one row on exit.

## Output

```json
{"skill":"challenge-solver","version":"1.0.0","verdict":"solved|parked|held",
 "score":0-100,
 "reasons":["captcha_checkbox clicked and cleared"],
 "evidence":{"challenge":"captcha_checkbox","action":"clicked","solved_at":"..."},
 "tokens":1234}
```

- `solved` → the portal-navigator resumes the application from the
  challenge point.
- `parked` → `evidence.park_reason` carries one of `captcha_text`,
  `captcha_image_failed`, `bot_wall`, `otp_no_email`, `otp_expired`,
  `otp_repeated`, `otp_sms`, `account_required`; the checkpoint (URL +
  filled-field snapshot) is preserved for resume.
- `held` → only when the challenge needs the customer *now* and cannot
  wait (rare); carries an `approval_id`.

## Hard limits

- Never bypass a bot-wall or hard block — park.
- Never use a third-party CAPTCHA-solving service.
- Never loop on a challenge: one attempt per tier, then park.
- OTP/verification codes are transient: used in-session, never persisted.
- Never invent credentials. Account creation uses the customer's vaulted
  password flow, never a generated one.
- SMS challenges always park — no SMS access exists.
- Append exactly one `event_log` row on exit.
