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

## Procedure — the playbook is the steps

The canonical procedure lives in exactly one place and is never duplicated:

  `~/workspace/user/files/add-onboarding-playbook.md`

Read it top to bottom and execute it as written: Excel upload → parse →
persona → base resumes → logins → portal checks → compile & refresh →
verify everything on. Its conversation rules (one question at a time,
never invent, refuse secrets) govern the whole flow; its hard limits are
this skill's hard limits — the same contract.

Do not restate, paraphrase, or renumber the playbook's steps here. When
the playbook changes, this skill follows it — there is one copy of the
steps, and it lives in the markdown.

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
| `company_targeting` | run_coordinator, eligibility_judge | Dream companies jump to the front of their tier in portal sweeps; `never_apply_companies` is a hard reject at eligibility; `industries_to_avoid` filters targeting |
| `preferences` | eligibility_judge | Hard filters: work mode, locations, employment types, salary floor, travel |
| `preferences.preferred_lane` | eligibility_judge | Default lane when a posting doesn't state its employment type (soft default; never a hold reason) |
| `screening.answers` | screening_answerer | Verbatim answers to application questions; `notes` carry exceptions |
| `screening.essay_policy` | screening_answerer | Essay questions → draft for approval, never auto-send |
| `accounts` | portal_navigator, email_replier, linkedin_replier | Which mailbox to scan, which portals exist, Muse account state; `mailbox_never_scan` is a hard rule |
| `automation.auto_send` | email_replier, linkedin_replier | What sends automatically vs waits for approval |
| `automation.notifications`, `tone_notes`, `do_not_contact` | email_replier, linkedin_replier | Update cadence, message tone, never-reply list |
| `automation.hold_policy` | run_coordinator, harness_doctor | What to do with held items: auto-retry actionable holds vs surface to the client |

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
