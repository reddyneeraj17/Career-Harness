<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

# client-onboarding

Turn a filled Client Onboarding Form (Excel v2) into a client persona file
that every other skill reads from. The persona is the user, on disk: once
it exists, no agent ever asks the client for anything already in it.

## Inputs

- Filled form: path to the client's `.xlsx` (v2 layout: `Start Here`,
  `Lists`, `1 About You` … `10 Sign-off`).
- The resume files the client attached (names must match the Resumes tab).
- Output: `~/workspace/profiles/<client_id>.yaml`
  (`client_id` = slug of the client's full name, e.g. `jordan-a-patel`).

## Procedure

1. **Receive and place the upload.** The client sends the filled Excel as a
   file upload in chat — they never touch the filesystem. Save it to
   `~/workspace/profiles/inbox/` (the upload drop folder), keeping the
   original filename. Then run the converter — never hand-write the YAML:
   `python3 ~/workspace/client-onboarding-form/excel_to_persona_yaml.py ~/workspace/profiles/inbox/<form.xlsx>`
   It reads every sheet, writes `~/workspace/profiles/<client_id>.yaml`, and
   prints warnings for missing required fields (identity name/email,
   work_auth status, ≥1 resume, ≥1 target role, sign-off name/date).
   After a successful conversion, move the processed form to
   `~/workspace/profiles/inbox/done/`.
2. **Refuse secrets.** The converter aborts if any prompt-style label asks
   for a password, code, or payment detail. If it aborts, stop and tell the
   operator which label tripped it — do not work around it.
3. **Resolve warnings with the client.** Every warning is a real gap
   (usually sign-off or a blank required field). Do not invent the value;
   ask the client and re-run the converter.
4. **Validate.** Check the YAML against
   `~/workspace/harness-kit/templates/client-persona.schema.yaml`
   (required keys, types, enums). A half-persona never ships.
5. **Register resumes.** For each row in `resumes`, confirm the attached
   file exists, compute its SHA-256, and register it as a variant via the
   harness `resume_register` action (label, file_name, hash, role_family,
   industry_tags). The persona's `resumes[].file_name` must match the
   registered file exactly.
6. **Report.** One concise summary to the operator: client_id, resume
   variants registered (with hashes), target roles loaded, warnings
   resolved, and anything still blank that agents will hold on.

## Persona read contract

The run-coordinator loads `profiles/<client_id>.yaml` once at run start
(`client_id` comes from the campaign config) and every downstream skill
reads from that loaded persona — never from guesses, never by re-asking
the client. Section → consumer mapping:

| Persona section | Read by | Used for |
|---|---|---|
| `identity` | screening_answerer, email_replier, linkedin_replier | Names, contact details, headline, start date on forms and in messages |
| `work_auth` | h1b_judge, eligibility_judge, screening_answerer | Sponsorship gate, sponsorship sentence pasted verbatim to recruiters |
| `resumes` | resume_picker | Which base variant to tailor per JD |
| `years_matrix` | fit_judge, resume_tailor, screening_answerer | Fit scoring; the truth boundary for tailoring — never claim more years than listed; every "years of X" screening answer |
| `target_roles` | run_coordinator (scouts), fit_judge, resume_picker | Search queries, fit scoring, variant choice |
| `preferences` | eligibility_judge | Hard filters: work mode, locations, employment types, salary floor, travel |
| `screening.answers` | screening_answerer | Verbatim answers to application questions; `notes` carry exceptions |
| `screening.essay_policy` | screening_answerer | Essay questions → draft for approval, never auto-send |
| `accounts` | portal_navigator, email_replier, linkedin_replier | Which mailbox to scan, which portals exist, Muse account state; `mailbox_never_scan` is a hard rule |
| `automation.auto_send` | email_replier, linkedin_replier | What sends automatically vs waits for approval |
| `automation.notifications`, `tone_notes`, `do_not_contact` | email_replier, linkedin_replier | Update cadence, message tone, never-reply list |

## Answering "extra questions" from the persona

When any agent needs a fact about the client (a screening question, a
recruiter's "what's your visa status", a form field), the lookup order is:

1. `screening.answers` — exact or closest-match question first.
2. The matching persona section (`work_auth`, `identity`, `preferences`).
3. If nothing matches: HOLD for the client (approval_enqueue). Never
   invent, never interpolate from a nearby field.

`total_years_experience` is a ceiling: no form, message, or tailored
resume may claim more total years, and no skill entry may claim more
years than its `years_matrix` row.

## Hard limits

- Never invent a persona value. Blank means hold/ask, not guess.
- Never store passwords, one-time codes, or payment details in the
  persona. `accounts.portal_creation.standard_password` stays empty —
  the client sets it inside Muse.
- Never edit a persona by hand after onboarding; the client refills the
  form (or the relevant tab) and the converter re-runs. The YAML is a
  build artifact, not the edit point.
- One persona per client. Campaigns select the client via `client_id`;
  the coordinator loads exactly one persona per run.
