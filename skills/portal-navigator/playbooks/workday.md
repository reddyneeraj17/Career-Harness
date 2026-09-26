# Workday playbook

## Detect
- URL contains `myworkdayjobs.com` (e.g. `*.wd3.myworkdayjobs.com`).
- Page footer or title mentions "Workday"; `wd:` prefixed element ids in page source.

## Field mapping
- A Workday account/profile is usually required first — create one only with email+password; park if SMS verification appears.
- Upload the resume first; autofill populates fields — verify every field, never trust the parse blindly.
- Map by visible label text. Country selection can reload the page — re-screenshot after any reload.

## Submit button
- "Submit Application" at the bottom of the final review page. Two-step: review page, then the submit click.

## Confirmation
- Capture strings like "You have successfully submitted your application" and any "Application ID".
- Screenshot the confirmation page.

## Known quirks
1. Session timeout ~20 minutes — complete in one pass; park with a checkpoint if timed out.
2. "You have already applied" banner → `blocked`, reason `duplicate_portal`.
3. Some tenants add voluntary-disclosure pages post-submit — skip/decline them; they are not required.
