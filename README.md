# Job-Apply Harness — Install Kit

The shippable software for the Job-Apply Harness (blueprint v2.8, Database
Edition, Skills-First). Installs into one customer's Muse environment per
INSTALL.md. One customer = one environment = one `harness-core`.

## Kit layout

```
~/workspace/
├── profile.yaml                  # THE human-editable rule source (step 5 of install)
├── templates/
│   ├── profile.schema.yaml       # validation schema — compile fails loudly on gaps
│   ├── linkedin_feed.body.md     # thin compiled-body templates (one per job)
│   ├── career_portal.body.md
│   ├── job_board.body.md
│   ├── email_scan.body.md
│   ├── linkedin_replies.body.md
│   ├── approval-judge.body.md
│   ├── daily-report.body.md
│   ├── token-usage.body.md
│   ├── weekly-review.body.md
│   └── harness-doctor.body.md
└── harness-kit/
    ├── README.md                 # this file
    ├── INSTALL.md                # installer runbook (8 steps + upgrade playbook)
    ├── skills/                   # 18 versioned skills — THE logic layer
    │   ├── linkedin-feed-hunting, job-board-search, career-portal-sweep
    │   ├── eligibility-judge, h1b-judge, fit-judge
    │   ├── resume-picker, resume-tailor, resume-reviewer
    │   ├── screening-answerer, portal-navigator (+ per-ATS playbooks)
    │   ├── email-replier, linkedin-replier
    │   └── approval-judge, run-coordinator, compile-schedules,
    │       harness-doctor, daily-report
    ├── goal-skeletons/           # thin goal contracts (GOAL.md per campaign)
    │   ├── linkedin_feed/GOAL.md
    │   ├── career_portal/GOAL.md
    │   ├── job_board/GOAL.md
    │   ├── email_scan/GOAL.md
    │   └── linkedin_replies/GOAL.md
    ├── harness-core/             # fullstack artifact source: SQLite store +
    │                             # published actions + 6 dashboard tabs
    │   ├── client/  server/  drizzle/   # (migrations applied in order)
    └── seed/                     # bulk-load CSVs (never customer data)
        ├── h1b_employer_hub.csv  # USCIS Employer Data Hub FY2021–2025
        └── companies_seed.csv    # tier/industry/ATS seed list
```

## What ships in the kit
- 18 versioned skills + READMEs (Inputs / Actions called / Output / Hard limits)
- Body templates + `profile.schema.yaml`
- Empty goal skeletons (GOAL.md contracts; cron bodies are compiled at install)
- `harness-core` source: schema, actions, migrations, six dashboard tabs
  (Overview, Applications, Resumes, Runs, Replies, Profile) over the single `snapshot()` API;
  per-run token metering; per-application resume evidence
- Seed CSVs (H-1B data, company tiers)
- Installer runbook + this blueprint's architecture (see the blueprint PDF)

## What NEVER ships
- Resumes or tailored PDFs
- Applications, postings, conversations, replies
- Memory files, people pages, notes
- Credentials, connected accounts, API keys
- Token history, run logs, customer corrections or outcomes
- Any `[FILL IN]` left unfilled — the compile fails loudly by design

## The principle
**Files hold the evidence; the database holds the truth; skills hold the logic.**
Schedules wake workers. Workers act only through harness-core, following skills.
Dashboards read harness-core. The main agent decides what reaches the phone.

## Start here
Read `INSTALL.md`, then run the 8 steps. Declare live only when all pass.

## Documentation map

| Reader | Start with |
|---|---|
| Customer (the job seeker) | `docs/OPERATOR.md` — what it is, install, daily use, help |
| Customer's Muse (the operator) | `CUSTOMER_RULES.md` first, then `INSTALL.md` |
| Maintainer (releases, packaging) | `PACKAGING.md`, then `CHANGELOG.md` |
| Architecture (the spec) | `docs/job-apply-harness-blueprint-v2.pdf` |

`CUSTOMER_RULES.md` is law in every customer environment: kit code is
read-only there; changes ship only as new releases via `install/upgrade.sh`.
