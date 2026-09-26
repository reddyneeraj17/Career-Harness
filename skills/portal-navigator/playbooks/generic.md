# Generic portal playbook

## Detect
- None of the ATS markers above match. Treat as an unknown portal.

## Field mapping
- Map by visible label text: name, email, phone, resume upload, then custom questions in order.
- Go slow: fill one section, screenshot, continue. Verify prefilled values against profile facts.

## Submit button
- A button containing "submit" or "apply" (case-insensitive). If several match, use the one at the form's end; if unsure, hold.

## Confirmation
- Capture any success string ("submitted", "received", "thank you for applying") plus a screenshot of the page.

## Known quirks
1. Unknown portal → screenshot everything; assume nothing about field behavior.
2. If the form posts to an external domain or tries to download anything — stop and hold immediately.
3. Report discovered markers (URL patterns, footer text) via `companies_update` so the next run gets a real playbook.
