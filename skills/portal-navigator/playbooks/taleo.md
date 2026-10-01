# Taleo playbook

## Detect
- URL contains `taleo.net` (e.g. `*.taleo.net/careersection/...`).
- Page mentions "Taleo" or shows the classic Taleo profile-login interstitial.

## Field mapping
- Taleo usually forces profile creation before the application — create one
  only with email+password; park if SMS verification appears.
- "Save and continue" between sections; the session can expire silently —
  re-screenshot after every section save.

## Submit button
- "Submit" on the final review page; some tenants add a second
  confirmation click.

## Confirmation
- Capture "Your application has been submitted" / submission number.
- Screenshot the confirmation page.

## Known quirks
1. **Taleo walls** (mandatory profile creation with no email-only path,
   SSO-only login, tenant access blocks) → park with reason
   `taleo_wall: <specific>`, never hold — see the portal walls playbook in
   SKILL.md.
2. Session expiry mid-flow → evidence note + park with checkpoint, not fail.
3. "You have already applied" banner → `blocked`, reason `duplicate_portal`.
