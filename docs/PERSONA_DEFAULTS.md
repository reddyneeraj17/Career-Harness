# Persona Default Rules

**Purpose.** When a customer doesn't provide a value during onboarding, the
system assumes the default below — never a blank that stalls the pipeline,
never an invented fact. The setup engineer pre-fills every defaulted field
from the resume + these rules; the customer only **corrects** on the setup
call and can change anything later (profile edit → schedules recompile).

**Two tiers:**
- **MUST ASK** — no safe default exists (legal facts, identity, files). The
  form forces a choice; the engineer asks on the setup call.
- **DEFAULTED** — the system assumes the value below. The customer sees it
  pre-filled in blue and changes only what’s wrong.

## MUST ASK (7 items)

| # | Field | Why no default |
|---|---|---|
| 1 | Full name, email, phone | Identity — cannot invent |
| 2 | Work authorization status | Legal fact |
| 3 | Sponsorship required now/future | Legal fact; drives the H-1B gate |
| 4 | Resume PDFs | The files themselves |
| 5 | Total years of professional experience | One number; pre-fill from resume work-history span, customer confirms (ceiling rule: nothing may ever claim more) |
| 6 | Non-compete / restrictive covenants | Legal fact |
| 7 | Sign-off (name + date) | Go-live authorization |

Also asked verbally on the setup call (1 second each, pre-filled with the
safe guess): driver’s license, veteran status, felony (default No —
customer confirms aloud), security clearance (default None), languages
(from resume, default English).

## DEFAULTED — everything else

### Identity
| Field | Default | Note |
|---|---|---|
| preferred_name | First name | |
| timezone | Derived from state (TX→US Central, etc.) | Ask only if state missing |
| linkedin_url, github_url, website | Blank | Hold only if a form truly requires it |

### Work authorization
| Field | Default | Note |
|---|---|---|
| h1b_gate | `prefer` — “Prefer sponsors but apply everywhere” | Soft gate; never strict unless customer chooses it |
| apply_without_sponsorship_mention | Yes | |
| skip_no_sponsorship_postings | Yes | Employer-side hard rejection; skipping saves budget |
| sponsorship_sentence | Generated: “I am authorized to work in the US and {will / will not} require sponsorship in the future.” | Built from the MUST ASK answers; engineer reviews wording |

### Resumes
| Field | Default | Note |
|---|---|---|
| primary | First-listed variant | |
| role_family / industry_tags | Copied from the customer’s target roles | |
| Standard upload filename | `<First>_<Last>_Resume.pdf` | |

### Experience matrix (years_matrix) — the critical default
- **Default: extracted from the resume by the engineer (AI-assisted).**
  Every skill/tool on the resume becomes a row; years are estimated from
  employment-history dates and **rounded down**; nothing exceeds
  `total_years_experience`.
- The customer **verifies the matrix on the setup call** — it is the truth
  boundary for fit scoring, tailoring, and every “years of X” answer.
- At runtime, a skill missing from the matrix → answer 0 or skip. Never
  infer.

### Target roles — broad by default
| Field | Default | Note |
|---|---|---|
| titles | Derived from resume titles (current + recent) | Engineer seeds; customer reorders |
| seniority | **Senior, Staff/Principal, Lead/Manager** (multi) | Broad; customer narrows only if they want |
| industries | Any | |
| keywords | From resume skill vocabulary | Engineer seeds |
| avoid_titles | Blank | |
| priority | List order = priority | |

### Company targeting
| Field | Default | Note |
|---|---|---|
| tier_preference | Any — sweep ascends tier 1 → 2 → 3 | |
| industries_to_avoid | Blank | |
| never_apply_companies | **Current employer** (from identity) | Auto-excluded; engineer confirms |
| dream_companies | Blank — engineer asks “any dream companies?” on the call | Jump to front of their tier in sweeps |

### Preferences — broad search defaults
| Field | Default | Note |
|---|---|---|
| work_mode | No preference | |
| open_to_relocation | Yes – anywhere in the US | **Confirm aloud on setup call** (life decision) |
| preferred_metros | Remote US | Priority order, not a reject filter |
| us_only | Yes | |
| employment_types | **All five**: full_time, part_time, w2_contract, c2c_contract, internship | |
| preferred_lane | full_time | Used when a posting doesn’t state its type |
| agencies_ok | Yes | Vendors are the primary W2/C2C source |
| max_travel | Up to 25% | |
| min_base_salary_usd | Blank (no floor) | Apply broadly, evaluate offers later |
| desired_salary_answer | Negotiable | |
| salary_number_fallback | 0 | Portals that require a number |
| interview_windows | Blank — engineer asks | |

### Screening answers — pre-filled 24
| # | Question | Default |
|---|---|---|
| 1 | Authorized to work in the US | Yes |
| 2 | Require sponsorship | = work_auth answer (MUST be consistent) |
| 3 | Willing to relocate | Yes |
| 4 | On-site if required | Yes |
| 5 | Travel % | = max_travel |
| 6 | Background check | Yes |
| 7 | Drug test | Yes |
| 8 | Highest education | From resume |
| 9 | Graduation years | Prefer not to say |
| 10 | Non-compete | MUST ASK |
| 11 | Driver’s license | Ask (1 sec) |
| 12 | 18 or older | Yes |
| 13 | Previously worked here | No |
| 14 | Relatives at company | No |
| 15 | Veteran | Not a veteran (confirm on call) |
| 16 | Disability | Prefer not to say |
| 17 | Gender/race/ethnicity | Prefer not to say |
| 18 | Felony | No (**confirm aloud** on setup call) |
| 19 | How did you hear | LinkedIn |
| 20 | Currently employed | = employment_status |
| 21 | Contact current employer | No |
| 22 | Pronouns | Skip |
| 23 | Clearance | None (confirm on call) |
| 24 | Languages | From resume (default English) |
| | Essay questions | **Draft for my approval** (never auto-send) |

### Accounts
| Field | Default | Note |
|---|---|---|
| portals | LinkedIn Active; all other boards “Do not use” | Engineer asks which boards the customer uses; credentials go in the Muse vault, never the form |
| mailbox_scan | Outlook (recommended) | |
| mailbox_never_scan | Blank — engineer asks | Hard rule once set |
| muse account | Ask (have one / create for me) | |
| portal_creation.may_create | Yes | Password set by customer in vault |

### Automation
| Field | Default | Note |
|---|---|---|
| max_per_day | 50 | |
| max_per_run | 10 | |
| hours | Any time | |
| linkedin_actions_per_hour | 20 | Account protection |
| auto_send.routine_email_replies | Send automatically | |
| auto_send.interview_scheduling | Send automatically (windows only, never a binding time) | |
| auto_send.resume_requests | Send automatically | |
| auto_send.followup_nudges | Send automatically | |
| auto_send.linkedin_replies | Send automatically | |
| auto_send.linkedin_outreach | **Draft for my approval** | |
| auto_send.decline_contract_pitches | Send automatically | |
| hold_policy | **Auto-retry actionable holds; surface the rest in the daily digest** | Nobody watches a queue manually |
| notifications.frequency | Daily summary + urgent items | |
| notifications.channel | Muse chat | |
| immediate_on_interview | Yes | |

### Judge tuning (hidden, advanced)
| Field | Default |
|---|---|
| fit_judge threshold | 25 |

## The onboarding promise

> The customer provides **7 answers + resume PDFs**. The engineer pre-fills
> everything else from the resume and these rules. The setup call is a
> **correction pass** (~15 minutes), not a data-entry session. Anything the
> customer changes later flows through profile edit → recompile — no
> re-onboarding.

## Safety invariants (defaults never violate these)

1. Never invent identity, authorization, or legal facts.
2. `total_years_experience` is a ceiling; no matrix row exceeds it.
3. A missing matrix skill → 0/skip, never inference.
4. `never_apply_companies` always includes the current employer.
5. No passwords, codes, or payment details in the form or the persona.
