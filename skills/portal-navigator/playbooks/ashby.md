# Ashby playbook

## Detect
- URL on `jobs.ashbyhq.com`.

## Field mapping
- Single or stepped form: name, email, phone, resume upload, custom questions.
- Compensation questions are common — hold via `approval_enqueue` when the profile has no answer.

## Submit button
- "Submit Application" on the final step.

## Confirmation
- Capture "Application submitted" / "Thanks for applying". Screenshot it.

## Known quirks
1. Multi-step forms — screenshot every step, not just the last one.
2. Referral / employee-name field is optional — leave blank rather than invent.
3. Some forms keep the submit button disabled until every custom question is answered — unknown ones go to approval, never guesses.
