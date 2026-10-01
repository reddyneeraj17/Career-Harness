<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

# Portal Question Bank

Every question job-application portals ask, with the canonical answer, where
the answer comes from, and what the filler is allowed to do. This is the
shared reference for `screening-answerer` (Q&A) and `portal-navigator`
(field filling). Defaults here agree with `docs/PERSONA_DEFAULTS.md`.

## Risk tiers and actions

| Tier | Meaning | Filler action |
|---|---|---|
| **LOW** | Factual, persona-grounded, zero downside | Auto-fill, no special logging |
| **MEDIUM** | Deliberate choice (decline/negotiable/accept) | Auto-fill + log the choice in evidence |
| **HIGH** | Legal/sensitive or needs judgment | **Hold** for the customer — never auto-fill |
| **NEVER** | Forbidden | Hold + alert; never fill, never ask the customer to provide it in chat |

Lookup order for any form field: persona verbatim answer → bank entry below
→ hold. The bank never overrides a persona value the customer wrote.

## A. Identity & contact — all LOW, source `persona.identity`

| Canonical | Portal phrasings | Answer |
|---|---|---|
| first_name | First name, Given name | Derived: first token of full_name (preferred_name wins) |
| last_name | Last name, Family name, Surname | Derived: last token of full_name |
| full_name | Full name | persona.identity.full_name |
| email | Email, Email address | persona.identity.email |
| phone | Phone, Mobile, Contact number | persona.identity.phone |
| street_address | Street address, Address line 1 | persona.identity.street_address (only when the form requires it) |
| city / state / zip / country | City, State, ZIP, Country | persona.identity fields; country defaults USA |
| linkedin_url | LinkedIn profile, LinkedIn URL | persona.identity.linkedin_url |
| portfolio_url | Website, Portfolio, GitHub | github_url → website, first non-blank |
| headline | Professional headline | persona.identity.headline |

## B. Work authorization — all LOW, source `persona.work_auth`

| Canonical | Portal phrasings | Answer |
|---|---|---|
| authorized_us | Are you legally authorized to work in the US? | Yes |
| sponsorship_required | Will you now or in the future require sponsorship? | persona value (Yes/No) — never defaulted |
| visa_type | Visa status, Work authorization type | persona.work_auth.status |
| sponsorship_sentence | Explain your sponsorship situation | persona sentence, pasted verbatim |

## C. Experience — all LOW

| Canonical | Portal phrasings | Answer | Source |
|---|---|---|---|
| years_of_X | How many years of X? Years with X? | Exact number | `years_matrix[X]`, case-insensitive; missing → 0 or skip, never infer |
| total_years | Total years of experience | persona.identity.total_years_experience | Ceiling — nothing claims more |
| current_title | Current/most recent title | persona.identity.current_title | |
| current_employer | Current/most recent employer | persona.identity.current_employer | |
| notice_period | Notice period | persona value (e.g. "2 weeks") | |
| earliest_start | Earliest start date | persona value (YYYY-MM-DD) | |

## D. Education

| Canonical | Portal phrasings | Answer | Source | Risk |
|---|---|---|---|---|
| highest_degree | Highest level of education | e.g. Master's | persona / resume | LOW |
| school | University, Institution | persona | LOW |
| major | Field of study, Major | persona | LOW |
| graduation_year | Graduation year, Degree dates | **Prefer not to say** | bank default | MEDIUM (logged decline) |
| gpa | GPA | Leave blank (optional almost everywhere) | — | LOW |

## E. Logistics & preferences — all LOW, source `persona.preferences`

| Canonical | Portal phrasings | Answer |
|---|---|---|
| relocate | Willing to relocate? | Yes |
| travel_pct | Travel %, Willing to travel | max_travel (e.g. Up to 25%) |
| onsite_willing | Willing to work on-site / hybrid? | Yes |
| work_mode | Desired work arrangement | persona preference |
| shift | Shift preference | Day shift / standard (unless persona says otherwise) |
| start_date | Available start date | earliest_start_date |
| desired_salary | Desired salary / compensation | Negotiable → MEDIUM (logged) |
| salary_number | (numeric-required salary field) | 0 → MEDIUM (logged) |
| clearance | Security clearance | None |

## F. Legal & compliance

| Canonical | Portal phrasings | Answer | Risk |
|---|---|---|---|
| age_18 | Are you 18 or older? | Yes | LOW |
| background_check | Willing to undergo background check? | Yes | LOW |
| drug_test | Willing to take a drug test? | Yes | LOW |
| felony | Felony conviction? | persona value (default No, confirmed at onboarding) | **HIGH if persona blank → hold** |
| non_compete | Subject to non-compete / restrictive covenant? | persona value | **HIGH if blank → hold** |
| worked_here_before | Previously employed by us? | No | LOW |
| relatives_here | Relatives employed here? | No | LOW |
| contact_employer | May we contact your current employer? | No | LOW |
| employment_gap_explain | Explain any employment gaps | Leave blank unless persona has a note | LOW |

## G. EEO / voluntary self-identification — all MEDIUM (fill the decline, log it)

These are voluntary everywhere. The default is always the decline option —
never a substantive identity claim.

| Canonical | Answer |
|---|---|
| gender | I don't wish to answer / Decline |
| race_ethnicity | I don't wish to answer / Decline |
| veteran_status | I don't wish to answer (or persona value if given) |
| disability_status | I don't wish to answer / Decline |

## H. Referral & source — all LOW

| Canonical | Portal phrasings | Answer |
|---|---|---|
| how_heard | How did you hear about this job? | LinkedIn |
| referral_name | Employee referral name | Blank (honest — no invented referral) |
| recruiter_contact | Recruiter who contacted you | Blank unless the run has one |

## I. Agreements & consents — all MEDIUM (accept + log in evidence)

Standard application consents. The customer authorized applications at
sign-off; accepting the portal's standard terms is part of submitting.

| Canonical | Action |
|---|---|
| terms_accept | Accept |
| privacy_policy | Accept |
| eeo_consent | Accept (the consent to *ask*, not the self-ID) |
| certification | Accept — "I certify the information is true and complete" |
| background_check_consent | Accept |

Every acceptance is recorded in the application's evidence
(`evidence.consents: ["terms_accept", ...]` with timestamp).

## J. Free text — HIGH, never auto-sent

| Canonical | Action |
|---|---|
| why_us / why_role | Draft for customer approval (essay policy) |
| cover_letter_text | Generated by cover-letter-writer, customer-approved per application |
| describe_project | Draft for approval |
| additional_info | Leave blank (optional) → LOW; if required → draft for approval |

## K. NEVER answer — hold + alert

SSN / national ID, bank account / routing, payment details, passwords,
mother's maiden name / "security questions" with real answers, anything
the portal has no legitimate need for at application stage. The filler
holds the application and alerts — it never fills these and never asks
the customer to paste them into chat.

## Derivation rules (shared)

1. **Name split**: first_name = first token, last_name = last token;
   preferred_name overrides first_name.
2. **Phone format**: as persona holds it; strip to digits for
   numeric-only fields, keep +1 prefix where the field allows.
3. **Salary**: "Negotiable" for text fields; `0` for numeric-required
   fields — never a real number the customer didn't set.
4. **Years**: exact matrix value, never rounded up, never inferred from
   total years, never borrowed from a neighboring skill.
5. **Declines ship as answers**, not holds: "Prefer not to say" on
   graduation_year is a `pass`, not a hold.
6. **Blank is honest** for referral/gap fields — never invent.
