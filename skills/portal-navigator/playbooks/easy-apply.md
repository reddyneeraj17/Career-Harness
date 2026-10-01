# LinkedIn Easy Apply playbook

## Detect
- LinkedIn job page with an "Easy Apply" button; the flow runs in a LinkedIn modal, not a new tab.

## Field mapping
- Modal steps: contact info (prefilled from LinkedIn — verify), resume select, custom questions.
- **The resume dropdown defaults to the LinkedIn-stored resume — switch it to our tailored PDF and verify the filename.**
- Correct the phone field from profile facts; never invent.

## Submit button
- "Review your application" → "Submit application" on the final modal step.

## Confirmation
- Capture "Application sent" with its timestamp. Screenshot it.

## Known quirks
1. The "Follow company" checkbox is checked by default — uncheck it; never auto-follow.
2. Phone verification via SMS parks the flow — park with a checkpoint, never bypass.
3. Some modals inject employer-specific questions mid-flow — unknown ones go to approval, never guesses.
4. **Modal timeouts** → evidence note (`easy_apply_timeout`, which step) + back off and retry the step once; still timing out → park with checkpoint. Never fail the application for a timeout alone.
